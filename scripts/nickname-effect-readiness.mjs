import { readFileSync } from "node:fs";

const source = () => readFileSync(new URL("../drizzle/91-style-nickname-effect-write-boundary.sql", import.meta.url), "utf8");
export function nicknameEffectValidationSql() {
  const sql = source();
  const start = sql.indexOf("-- BEGIN NICKNAME EFFECT READ-ONLY VALIDATION");
  const end = sql.indexOf("-- END NICKNAME EFFECT READ-ONLY VALIDATION", start);
  if (start < 0 || end < start) throw new Error("Nickname effect validation missing");
  return sql.slice(start, end);
}

export async function assertNicknameEffectReadiness(sql) {
  const bodies = [...source().matchAll(/AS \$\$([\s\S]*?)\$\$;/g)].map(match => match[1]);
  return sql.begin("read only", async tx => {
    await tx.unsafe(nicknameEffectValidationSql());
    const rows = await tx`select proname, prosrc from pg_proc where oid in (
      'public.guard_nickname_effect_browser_write()'::regprocedure)`;
    for (const [index, name] of ["guard_nickname_effect_browser_write"].entries()) {
      if (rows.find(row => row.proname === name)?.prosrc !== bodies[index]) {
        throw new Error(`Nickname effect ${name} body differs from the release contract`);
      }
    }
  });
}
