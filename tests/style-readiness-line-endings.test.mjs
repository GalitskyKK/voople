import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

// Model a Windows checkout independently of the OS running this test.
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "node:fs" && /\/scripts\/[^/]+-readiness\.mjs$/.test(context.parentURL ?? "")) {
    return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(`
      import { readFileSync as read } from 'node:fs';
      export function readFileSync(...args) {
        return read(...args).replace(/\\r\\n?/g, '\\n').replace(/\\n/g, globalThis.readinessSourceEol);
      }
    `)}` };
  }
  return next(specifier, context);
} });
test.after(() => hooks.deregister());

const contracts = [
  ["app-theme", "89-style-app-theme-write-boundary.sql", "assertAppThemeReadiness", ["guard_app_theme_browser_write"]],
  ["nickname-font", "90-style-nickname-font-write-boundary.sql", "assertNicknameFontReadiness", ["guard_nickname_font_browser_write", "load_active_style_subjects"]],
  ["nickname-effect", "91-style-nickname-effect-write-boundary.sql", "assertNicknameEffectReadiness", ["guard_nickname_effect_browser_write"]],
  ["nickname-color", "92-style-nickname-color-write-boundary.sql", "assertNicknameColorReadiness", ["guard_nickname_color_browser_write"]],
  ["profile-card", "93-style-profile-card-write-boundary.sql", "assertProfileCardReadiness", ["guard_profile_card_browser_write"]],
];

function database(rows) {
  return { begin: async (mode, run) => {
    assert.equal(mode, "read only");
    let validated = false;
    const tx = async strings => {
      assert.equal(validated, true, "the SQL security contract still runs before body comparison");
      assert.match(strings.join(" "), /select .*prosrc[\s\S]*pg_proc/i);
      return rows;
    };
    tx.unsafe = async sql => {
      assert.match(sql, /^-- BEGIN .+ READ-ONLY VALIDATION/);
      validated = true;
    };
    return run(tx);
  } };
}

for (const [domain, filename, exportName, names] of contracts) {
  const check = (await import(`../scripts/${domain}-readiness.mjs`))[exportName];
  const source = readFileSync(new URL(`../drizzle/${filename}`, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
  const bodies = [...source.matchAll(/AS \$\$([\s\S]*?)\$\$;/g)].map(match => match[1]);
  const rows = eol => names.map((proname, i) => ({ proname, prosrc: bodies[i].replace(/\n/g, eol) }));

  test(`${domain}: LF and CRLF checkout/database combinations preserve the contract`, async () => {
    for (const fileEol of ["\n", "\r\n"]) for (const dbEol of ["\n", "\r\n"]) {
      globalThis.readinessSourceEol = fileEol;
      await check(database(rows(dbEol)));
    }
  });

  test(`${domain}: security and other whitespace drift still reject`, async () => {
    globalThis.readinessSourceEol = "\r\n";
    for (const replacement of [bodies[0].replace("current_user", "session_user"), ` ${bodies[0]}`]) {
      assert.notEqual(replacement, bodies[0]);
      const changed = rows("\n"); changed[0].prosrc = replacement;
      await assert.rejects(check(database(changed)), /body differs from the release contract/);
    }
  });

  test(`${domain}: a missing function still rejects`, async () => {
    globalThis.readinessSourceEol = "\n";
    await assert.rejects(check(database([])));
  });
}
