import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration, LEDGER_BOOTSTRAP } from "../../scripts/migration-runner.mjs";
import { assertLegacyCommerceRpcPrivileges, LEGACY_COMMERCE_RPC_SIGNATURES } from "../../scripts/legacy-commerce-rpc-privileges.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; no production fallback");

test("legacy commerce privilege migration preserves bodies, removes browser/PUBLIC access and skips safely through the ledger", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback",
  timeout: 60_000,
}, async () => {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    && !(process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && url.pathname.toLowerCase().includes("test"))) {
    throw new Error("Dedicated loopback or explicitly approved remote test database required");
  }
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const roles = { anon: `anon_${suffix}`, authenticated: `authenticated_${suffix}`, service: `service_role_${suffix}` };
  const inherited = `inherited_${suffix}`;
  const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 5,
    connection: { statement_timeout: 10_000, lock_timeout: 5_000 } });
  const migration = "81-legacy-commerce-rpc-privileges.sql";
  const source = await readFile(new URL(`../../drizzle/${migration}`, import.meta.url), "utf8");
  const bootstrap = await readFile(new URL("../../drizzle/45-app-schema-migrations.sql", import.meta.url), "utf8");
  try {
    for (const role of [...Object.values(roles), inherited]) await sql.unsafe(`CREATE ROLE "${role}" NOLOGIN INHERIT`);
    // All present, one absent, and all absent: migration never creates an RPC.
    for (const count of [6, 5, 0]) {
      const schema = `commerce_acl_${count}_${suffix}`;
      const qualify = (signature) => signature.replace("public.", `"${schema}".`);
      const signatures = LEGACY_COMMERCE_RPC_SIGNATURES.map(qualify);
      const isolate = (text) => text.replaceAll("public.", `"${schema}".`)
        .replaceAll(/\banon\b/g, `"${roles.anon}"`)
        .replaceAll(/\bauthenticated\b/g, `"${roles.authenticated}"`)
        .replaceAll(/\bservice_role\b/g, `"${roles.service}"`);
      const client = { begin: (run) => sql.begin(async (tx) => {
        const adapter = (strings, ...values) => tx.unsafe(isolate(strings.reduce((text, part, i) => text + (i ? `$${i}` : "") + part, "")), values);
        adapter.unsafe = (text) => tx.unsafe(isolate(text));
        return run(adapter);
      }) };
      const apply = (file, body, releaseVersion = "test") => applyMigration(client, { file, source: body, releaseVersion });
      const snapshot = () => sql.unsafe(`SELECT p.oid::regprocedure::text AS signature,
        pg_get_functiondef(p.oid) AS definition, p.proacl::text AS acl, p.proowner, p.proconfig
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname=$1 ORDER BY signature`, [schema]);
      try {
        await sql.unsafe(`CREATE SCHEMA "${schema}"; GRANT USAGE ON SCHEMA "${schema}" TO "${roles.anon}", "${roles.authenticated}", "${roles.service}"`);
        for (const signature of signatures.slice(0, count)) {
          await sql.unsafe(`CREATE FUNCTION ${signature} RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
            GRANT EXECUTE ON FUNCTION ${signature} TO PUBLIC, "${roles.anon}", "${roles.authenticated}", "${roles.service}"`);
        }
        const untouched = [
          qualify("public.assign_group_boost_slot(uuid,smallint,uuid,uuid)"),
          qualify("public.group_effective_boost_capacity(uuid)"),
          qualify("public.group_perk_is_active(uuid,varchar)"),
          qualify("public.ensure_user_wallet(uuid,text)"),
        ];
        for (const signature of untouched) await sql.unsafe(`CREATE FUNCTION ${signature} RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 2';
          REVOKE EXECUTE ON FUNCTION ${signature} FROM PUBLIC;
          GRANT EXECUTE ON FUNCTION ${signature} TO "${roles.service}"`);
        const canonicalUntouched = (await sql`SELECT to_regprocedure(signature)::text AS signature
          FROM unnest(${untouched}::text[]) AS requested(signature)`).map(r => r.signature);
        await apply(LEDGER_BOOTSTRAP, bootstrap);
        const before = await snapshot();
        if (count) await assert.rejects(assertLegacyCommerceRpcPrivileges(sql, { signatures, roles }), /unsafe/);
        assert.equal((await apply(migration, source)).status, "applied");
        const checked = await assertLegacyCommerceRpcPrivileges(sql, { signatures, roles });
        assert.equal(checked.length, count);
        for (const signature of signatures.slice(0, count)) {
          const args = signature.match(/\((.*)\)$/)[1].split(",").map(type => `NULL::${type}`).join(",");
          await sql.begin(async tx => {
            await tx.unsafe(`SET LOCAL ROLE "${roles.service}"`);
            assert.equal((await tx.unsafe(`SELECT ${signature.split("(")[0]}(${args}) AS result`))[0].result, 1);
          });
          for (const role of [roles.anon, roles.authenticated]) {
            await assert.rejects(sql.begin(async tx => {
              await tx.unsafe(`SET LOCAL ROLE "${role}"`);
              await tx.unsafe(`SELECT ${signature.split("(")[0]}(${args})`);
            }), { code: "42501" });
          }
        }
        const after = await snapshot();
        const withoutAcl = ({ signature, definition, proowner, proconfig }) => ({ signature, definition, proowner, proconfig });
        assert.deepEqual(after.map(withoutAcl), before.map(withoutAcl));
        assert.equal(after.filter(r => canonicalUntouched.includes(r.signature)).length, untouched.length);
        assert.deepEqual(after.filter(r => canonicalUntouched.includes(r.signature)), before.filter(r => canonicalUntouched.includes(r.signature)));
        const records = await sql.unsafe(`SELECT * FROM "${schema}".app_schema_migrations ORDER BY id`);
        assert.equal((await apply(migration, source, "different-release")).status, "already-applied");
        assert.deepEqual(await snapshot(), after);
        assert.deepEqual(await sql.unsafe(`SELECT * FROM "${schema}".app_schema_migrations ORDER BY id`), records);
        for (const signature of signatures.slice(count)) {
          const [{ absent }] = await sql`SELECT to_regprocedure(${signature}) IS NULL AS absent`;
          assert.equal(absent, true);
        }
        if (count === 6) {
          // Effective inherited privileges must also fail readiness.
          await sql.unsafe(`GRANT EXECUTE ON FUNCTION ${signatures[0]} TO "${inherited}";
            GRANT "${inherited}" TO "${roles.anon}"`);
          await assert.rejects(assertLegacyCommerceRpcPrivileges(sql, { signatures, roles }), /unsafe/);
          await sql.unsafe(`REVOKE "${inherited}" FROM "${roles.anon}";
            REVOKE EXECUTE ON FUNCTION ${signatures[0]} FROM "${inherited}";
            REVOKE EXECUTE ON FUNCTION ${signatures[0]} FROM "${roles.service}"`);
          await assert.rejects(assertLegacyCommerceRpcPrivileges(sql, { signatures, roles }), /unsafe/);
        }
      } finally {
        await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    }
  } finally {
    for (const role of [...Object.values(roles), inherited]) await sql.unsafe(`DROP ROLE IF EXISTS "${role}"`);
    await sql.end({ timeout: 5 });
  }
});
