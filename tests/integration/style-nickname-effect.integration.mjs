import "../helpers/style-plan-runtime.mjs";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { ensureTestRoles } from "./helpers/test-roles.mjs";
import { applyMigration } from "../../scripts/migration-runner.mjs";
import { assertNicknameEffectReadiness } from "../../scripts/nickname-effect-readiness.mjs";
import { assertAppThemeReadiness } from "../../scripts/app-theme-readiness.mjs";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/server/services/upload.service") return { shortCircuit: true,
    url: "data:text/javascript,export const resolvePublicMediaKey = () => { throw new Error('Unexpected upload'); };" };
  return next(specifier, context);
} });
const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
const restUrl = process.env.VOOPLE_TEST_POSTGREST_URL?.trim();
if (process.env.CI && (!databaseUrl || !restUrl)) throw new Error("CI requires disposable PostgreSQL/PostgREST; security tests cannot skip");
const options = { skip: databaseUrl && restUrl ? false : "Disposable loopback services required; no production fallback", timeout: 120_000 };
const file = "91-style-nickname-effect-write-boundary.sql";
const source = await readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8");
const sqlFile = name => readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8");
const secret = "disposable-theme-test-secret-at-least-32-characters";
function jwt(role, sub) {
  const encode = v => Buffer.from(JSON.stringify(v)).toString("base64url");
  const value = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role, sub, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${value}.${createHmac("sha256", secret).update(value).digest("base64url")}`;
}
function loopback() {
  for (const value of [databaseUrl, restUrl]) assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname));
}

test("91 compatible adoption preserves rows; checksum no-op; readiness detects drift; atomic failure", options, async () => {
  loopback();
  const admin = postgres(databaseUrl, { max: 1, prepare: false });
  const name = `voople_effect_${crypto.randomUUID().replaceAll("-", "")}`;
  const url = new URL(databaseUrl); url.pathname = `/${name}`;
  let sql;
  try {
    await ensureTestRoles(admin); await admin.unsafe(`CREATE DATABASE ${name} TEMPLATE template0`);
    sql = postgres(url.toString(), { max: 1, prepare: false });
    await sql.unsafe(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;`);
    for (const base of ["45-app-schema-migrations.sql", "82-core-baseline-compatibility.sql", "83-commerce-prerequisite-compatibility.sql", "84-commerce-base-compatibility.sql", "80-personal-plan-grant-foundation.sql", "89-style-app-theme-write-boundary.sql", "90-style-nickname-font-write-boundary.sql"]) {
      await applyMigration(sql, { file: base, source: await sqlFile(base), releaseVersion: "theme-test" });
    }
    const user = crypto.randomUUID();
    await sql`insert into users(id,username,display_name) values (${user},'theme-test','Theme')`;
    await sql`insert into profile_customization(user_id,app_theme_id,nickname_effect) values (${user},'violet','gradient')`;
    const before = await sql`select row_to_json(p) as row from profile_customization p`;
    const beforeAcl = await sql`select relacl::text from pg_class where oid='profile_customization'::regclass`;
    const apply = s => applyMigration(sql, { file, source: s, releaseVersion: "theme-test" });
    await assert.rejects(apply(source + "\nDO $$ BEGIN RAISE EXCEPTION 'rollback test'; END $$;"), /rollback test/);
    assert.equal((await sql`select count(*)::integer as n from app_schema_migrations where id=${file}`)[0].n, 0);
    assert.equal((await sql`select to_regprocedure('guard_nickname_effect_browser_write()') as fn`)[0].fn, null);
    assert.equal((await apply(source)).status, "applied"); await assertAppThemeReadiness(sql); await assertNicknameEffectReadiness(sql);
    assert.deepEqual(await sql`select row_to_json(p) as row from profile_customization p`, before);
    assert.deepEqual(await sql`select relacl::text from pg_class where oid='profile_customization'::regclass`, beforeAcl);
    const ledger = await sql`select * from app_schema_migrations where id=${file}`;
    assert.equal((await apply(source)).status, "already-applied");
    assert.deepEqual(await sql`select * from app_schema_migrations where id=${file}`, ledger);
    await sql.unsafe("ALTER TABLE profile_customization DISABLE TRIGGER nickname_effect_browser_write_boundary");
    await assert.rejects(assertNicknameEffectReadiness(sql), /boundary/);
    await sql.unsafe("ALTER TABLE profile_customization ENABLE ALWAYS TRIGGER nickname_effect_browser_write_boundary");
    for (const mutation of [
      "GRANT EXECUTE ON FUNCTION guard_nickname_effect_browser_write() TO authenticated",
      "ALTER FUNCTION guard_nickname_effect_browser_write() SECURITY DEFINER",
      "ALTER FUNCTION guard_nickname_effect_browser_write() SET search_path = public",
      "CREATE OR REPLACE FUNCTION guard_nickname_effect_browser_write() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$ BEGIN RETURN NEW; END; $$",
    ]) {
      await assert.rejects(sql.begin(async tx => {
        await tx.unsafe(mutation);
        await assertNicknameEffectReadiness({ begin: async (mode, run) => {
          assert.equal(mode, "read only"); return run(tx);
        } });
      }), /incompatible|differs/);
      await assertNicknameEffectReadiness(sql);
    }
    // Actual SQL role, including a spoofed JWT service-role claim, protects both facts.
    for (const role of ["anon", "authenticated"]) for (const patch of ["nickname_effect='neon'", "nickname_gradient=true"]) await assert.rejects(sql.begin(async tx => {
      await tx.unsafe(`SET LOCAL ROLE ${role}`); await tx`select set_config('request.jwt.claim.sub',${user},true)`;
      await tx`select set_config('request.jwt.claims','{"role":"service_role"}',true)`;
      await tx.unsafe(`update profile_customization set ${patch} where user_id=$1`, [user]);
    }), { code: "42501" });
  } finally {
    if (sql) await sql.end(); await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); await admin.end();
  }
});

test("real REST browser boundary and Style consumer preserve legacy field gates and saved preferences", options, async (t) => {
  loopback();
  const sql = postgres(databaseUrl, { max: 4, prepare: false });
  const schema = "nickname_effect_test"; const user = crypto.randomUUID(); const other = crypto.randomUUID();
  const request = async (role, method, body, filter = "", prefer = "return=representation", sub = user) => fetch(`${restUrl}/profile_customization${filter}`, {
    method, headers: { Authorization: `Bearer ${jwt(role, sub)}`, "Content-Type": "application/json",
      "Accept-Profile": schema, "Content-Profile": schema, Prefer: prefer },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    await ensureTestRoles(sql);
    await sql.unsafe(`CREATE SCHEMA ${schema}; GRANT USAGE ON SCHEMA ${schema} TO anon,authenticated,service_role;
      CREATE TABLE ${schema}.users(id uuid PRIMARY KEY);
      INSERT INTO ${schema}.users VALUES ('${user}'),('${other}');`);
    // Use the attested customization columns, grants and own-row/public-read policies.
    const fixture = JSON.parse(await readFile(new URL("../fixtures/commerce-base.json", import.meta.url), "utf8"));
    const table = fixture.tables.find(t => t.name === "profile_customization");
    for (const [name, labels] of fixture.enums) await sql.unsafe(`CREATE TYPE ${schema}.${name} AS ENUM (${labels.map(l => `'${l}'`).join(",")})`);
    await sql.unsafe(`CREATE TABLE ${schema}.profile_customization (${table.columns.map(c => `${c[0]} ${c[1].replaceAll("public.", `${schema}.`)}${c[3] !== null ? ` DEFAULT ${c[3].replaceAll("public.", `${schema}.`)}` : ""}${c[2] ? "" : " NOT NULL"}`).join(",")}, PRIMARY KEY(user_id));
      ALTER TABLE ${schema}.profile_customization ENABLE ROW LEVEL SECURITY;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ${schema}.profile_customization TO anon,authenticated,service_role;`);
    // auth.uid() equivalent scoped to this isolated schema, reading signed PostgREST claims.
    await sql.unsafe(`CREATE OR REPLACE FUNCTION ${schema}.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT (nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb->>''sub'')::uuid'`);
    for (const p of table.policies) await sql.unsafe(`CREATE POLICY ${p.name} ON ${schema}.profile_customization FOR ${{ r: "SELECT", a: "INSERT", w: "UPDATE", d: "DELETE" }[p.command]} TO PUBLIC${p.using_expression ? ` USING (${p.using_expression.replaceAll("auth.uid()", `${schema}.uid()`)})` : ""}${p.check_expression ? ` WITH CHECK (${p.check_expression.replaceAll("auth.uid()", `${schema}.uid()`)})` : ""}`);
    await sql.unsafe((await sqlFile("80-personal-plan-grant-foundation.sql")).replaceAll("public.", `${schema}.`));
    await sql.unsafe((await sqlFile("89-style-app-theme-write-boundary.sql")).replaceAll("public.", `${schema}.`));
    await sql.unsafe((await sqlFile("90-style-nickname-font-write-boundary.sql")).replaceAll("public.", `${schema}.`));
    await sql.unsafe(source.replaceAll("public.", `${schema}.`));
    await sql.unsafe(`CREATE TABLE ${schema}.subscriptions(user_id uuid,tier text,started_at timestamptz,expires_at timestamptz);
      CREATE TABLE ${schema}.user_inventory(user_id uuid,item_id text);
      CREATE TABLE ${schema}.shop_items(equip_slot text,equip_value text,requires_subscription text);
      GRANT SELECT ON ${schema}.subscriptions,${schema}.user_inventory,${schema}.shop_items TO service_role;
      INSERT INTO ${schema}.profile_customization(user_id,app_theme_id) VALUES ('${user}','violet');`);
    await sql.unsafe("NOTIFY pgrst, 'reload schema'");
    let ready = false;
    for (let i = 0; i < 100; i++) {
      const probe = await request("service_role", "PATCH", { app_theme_id: "violet" }, `?user_id=eq.${user}`);
      if (probe.ok) { ready = true; break; }
      await new Promise(r => setTimeout(r, 200));
    }
    assert.ok(ready, "REST schema cache ready");
    await t.test("browser SQL roles block premium INSERT/UPDATE/UPSERT and permit free/unchanged/unrelated writes", async () => {
      for (const role of ["anon", "authenticated"]) {
        assert.ok((await request(role, "GET")).ok);
        for (const [method, body, filter, prefer] of [
          ["POST", { user_id: other, nickname_gradient: true }, "", "return=representation"],
          ["PATCH", { nickname_gradient: true }, `?user_id=eq.${user}`, "return=representation"],
          ["POST", { user_id: user, nickname_gradient: true }, "?on_conflict=user_id", "resolution=merge-duplicates,return=representation"],
          ["POST", { user_id: user, nickname_gradient: true }, "?on_conflict=user_id", "resolution=ignore-duplicates,return=representation"],
        ]) {
          await sql.unsafe(`UPDATE ${schema}.profile_customization SET nickname_gradient=false WHERE user_id=$1`, [user]);
          const response = await request(role, method, body, filter, prefer, body.user_id === other ? other : user);
          assert.equal(response.status, 403, await response.text());
        }
        for (const effect of ["gradient", "neon", "highlight", "outline"]) {
          for (const [method, body, filter, prefer] of [
            ["POST", { user_id: other, nickname_effect: effect }, "", "return=representation"],
            ["PATCH", { nickname_effect: effect }, `?user_id=eq.${user}`, "return=representation"],
            ["POST", { user_id: user, nickname_effect: effect }, "?on_conflict=user_id", "resolution=merge-duplicates,return=representation"],
          ]) {
            const response = await request(role, method, body, filter, prefer, method === "POST" && body.user_id === other ? other : user);
            assert.equal(response.status, 403, await response.text());
          }
        }
        assert.ok((await request("service_role", "PATCH", { nickname_effect: "gradient", nickname_gradient: true }, `?user_id=eq.${user}`)).ok);
        let retained = await request(role, "PATCH", { nickname_effect: "gradient", nickname_gradient: true, avatar_data: { retained: role } }, `?user_id=eq.${user}`);
        assert.ok(retained.ok, await retained.text());
        retained = await request(role, "PATCH", { nickname_gradient: false }, `?user_id=eq.${user}`);
        assert.ok(retained.ok, await retained.text());
        let response = await request(role, "PATCH", { nickname_effect: "neon" }, `?user_id=eq.${user}`);
        assert.equal(response.status, 403, await response.text());
        response = await request(role, "PATCH", { nickname_effect: "gradient", avatar_data: { fixture: role } }, `?user_id=eq.${user}`);
        assert.ok(response.ok, await response.text());
        response = await request(role, "PATCH", { avatar_data: { unrelated: role } }, `?user_id=eq.${user}`);
        assert.ok(response.ok, await response.text());
        response = await request(role, "PATCH", { nickname_effect: "plain" }, `?user_id=eq.${user}`);
        assert.ok(response.ok, await response.text());
        for (const extra of [{}, { nickname_effect: "plain" }]) {
          response = await request(role, "POST", { user_id: other, ...extra }, "", "return=representation", other);
          assert.ok(response.ok, await response.text());
          await sql.unsafe(`DELETE FROM ${schema}.profile_customization WHERE user_id=$1`, [other]);
        }
        response = await request(role, "POST", { user_id: user, nickname_effect: "plain" }, "?on_conflict=user_id", "resolution=merge-duplicates,return=representation");
        assert.ok(response.ok, await response.text());
        response = await request(role, "POST", { user_id: user, nickname_effect: "plain" }, "?on_conflict=user_id", "resolution=ignore-duplicates,return=representation");
        assert.ok(response.ok, await response.text());
        const rpc = await fetch(`${restUrl}/rpc/load_active_style_subjects`, { method: "POST", headers: {
          Authorization: `Bearer ${jwt(role, user)}`, "Content-Type": "application/json", "Content-Profile": schema,
        }, body: JSON.stringify({ p_user_ids: [user], p_evaluated_at: new Date().toISOString() }) });
        assert.ok([401, 403, 404].includes(rpc.status), await rpc.text());
      }
    });
    const requests = [];
    globalThis.styleTestAdmin = createClient("http://127.0.0.1:1", "disposable-only", { db: { schema }, auth: { persistSession: false }, global: {
      fetch: async (url, options) => {
        const destination = new URL(url); destination.pathname = destination.pathname.replace("/rest/v1", "");
        requests.push({ path: destination.pathname, method: options.method ?? "GET" });
        const headers = new Headers(options.headers); headers.set("Authorization", `Bearer ${jwt("service_role", user)}`);
        return fetch(`${restUrl}${destination.pathname}${destination.search}`, { ...options, headers });
      },
    } });
    const { updateCustomization, getEquippedCustomization } = await import("../../src/server/services/customization.service.ts");
    const { fulfillStylePlanGrant, revokeStylePlanGrant } = await import("../../src/server/services/style-plan.service.ts");
    const { loadNicknameFontAccessRest } = await import("../../src/server/data/nickname-font-access-rest.ts");
    const { mapUserToAuthor } = await import("../../src/server/mappers/profile.ts");
    await t.test("trusted Style effect consumer: Full denied, mixed fields isolated, saved preference restored", async () => {
      await sql.unsafe(`INSERT INTO ${schema}.personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until) VALUES ($1,'full','effect:full','2020-01-01','2099-01-01')`, [user]);
      await assert.rejects(updateCustomization(user, { nicknameEffect: "gradient" }));
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameEffect, "plain");
      await fulfillStylePlanGrant({ userId: user, sourceReference: "effect:style", validFrom: "2020-01-01T00:00:00Z", validUntil: "2099-01-01T00:00:00Z" });
      await updateCustomization(user, { nicknameEffect: "gradient" });
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameEffect, "gradient");
      assert.equal((await getEquippedCustomization(user)).savedNicknameGradient, true);
      await updateCustomization(user, { nicknameGradient: true, nicknameFont: "serif" });
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameFont, "serif");
      for (const patch of [{ profileFrameId: "frame-aurora" },
        { frameColor: "#123456" }, { cardBaseMode: "theme" }, { themePrimary: "#123456" }, { themeAccent: "#123456" }]) {
        await assert.rejects(updateCustomization(user, { nicknameEffect: "neon", ...patch }));
        assert.equal((await getEquippedCustomization(user)).savedNicknameEffect, "gradient");
      }
      const before = (await sql.unsafe(`SELECT row_to_json(p) as row FROM ${schema}.profile_customization p WHERE user_id=$1`, [user]))[0].row;
      await revokeStylePlanGrant({ sourceReference: "effect:style" });
      const projection = await loadNicknameFontAccessRest([user, other]);
      assert.equal(projection.get(user).activeStyleCoverage, false);
      assert.equal((await getEquippedCustomization(user)).savedNicknameEffect, "gradient");
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameEffect, "plain");
      assert.equal(mapUserToAuthor({ username: "font", display_name: "Font", profile_customization: before }, projection.get(user)).customization.displayName.effect, "plain");
      assert.deepEqual((await sql.unsafe(`SELECT row_to_json(p) as row FROM ${schema}.profile_customization p WHERE user_id=$1`, [user]))[0].row, before);
      await fulfillStylePlanGrant({ userId: user, sourceReference: "effect:restored", validFrom: "2020-01-01T00:00:00Z", validUntil: "2099-01-01T00:00:00Z" });
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameEffect, "gradient");
      await revokeStylePlanGrant({ sourceReference: "effect:restored" });
      await sql.unsafe(`INSERT INTO ${schema}.subscriptions VALUES ($1,'plus','2099-01-01','2099-12-01')`, [user]);
      await updateCustomization(user, { nicknameEffect: "neon" });
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameEffect, "neon");
      await sql.unsafe(`UPDATE ${schema}.subscriptions SET expires_at='2020-01-01' WHERE user_id=$1`, [user]);
      assert.equal((await getEquippedCustomization(user)).savedNicknameEffect, "neon");
      assert.equal((await getEquippedCustomization(user)).effectiveNicknameEffect, "plain");
      await updateCustomization(user, { nicknameEffect: "plain" });
      assert.equal((await getEquippedCustomization(user)).savedNicknameEffect, "plain");
      assert.ok(requests.filter(r => r.method !== "GET").every(r => ["/profile_customization", "/personal_plan_grants", "/rpc/load_active_personal_plan_grants", "/rpc/load_active_style_subjects"].includes(r.path)));
    });
    await t.test("coverage aggregate handles overlap beyond REST row limit, boundaries and RPC privileges", async () => {
      const at = new Date("2030-01-01T00:00:00Z");
      await sql.unsafe(`INSERT INTO ${schema}.personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until)
        SELECT $1,'style','effect:overlap:'||i,'2029-01-01','2031-01-01' FROM generate_series(1,1200) i`, [user]);
      await sql.unsafe(`INSERT INTO ${schema}.personal_plan_grants(user_id,plan_kind,source_reference,valid_from,valid_until)
        VALUES ($1,'style','effect:boundary','2030-01-01','2030-01-02')`, [other]);
      for (const [timestamp, expected] of [[at, true], [new Date("2029-12-31T23:59:59.999Z"), false], [new Date("2030-01-02T00:00:00Z"), false]]) {
        const access = await loadNicknameFontAccessRest([user, other], timestamp);
        assert.equal(access.get(user).activeStyleCoverage, true); assert.equal(access.get(other).activeStyleCoverage, expected);
      }
      for (const role of ["anon", "authenticated"]) await assert.rejects(sql.begin(async tx => {
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        await tx.unsafe(`SELECT ${schema}.load_active_style_subjects(ARRAY[$1::uuid],$2::timestamptz)`, [user, at]);
      }), { code: "42501" });
      await assert.rejects(sql.unsafe(`SELECT ${schema}.load_active_style_subjects(array_fill($1::uuid,ARRAY[201]),$2::timestamptz)`, [user, at]), { code: "22023" });
    });
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await sql.end();
  }
});
