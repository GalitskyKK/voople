import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
test("personal grants enforce uniqueness, actual privileges/RLS and exact boundaries", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured; production is never used",
  timeout: 30_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)
    && !(process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && parsed.pathname.toLowerCase().includes("test"))) {
    throw new Error("Dedicated loopback or explicitly approved remote test database required");
  }
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const schema = `personal_test_${suffix}`;
  const roles = { anon: `anon_${suffix}`, authenticated: `auth_${suffix}`, service_role: `service_${suffix}` };
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  const user = crypto.randomUUID();
  const other = crypto.randomUUID();
  const now = "2026-10-01T12:00:00Z";
  const insert = (source, kind = "style", from = now, until = "2026-11-01T00:00:00Z", owner = user) => sql.unsafe(`
    INSERT INTO "${schema}".personal_plan_grants (user_id, plan_kind, source_reference, valid_from, valid_until)
    VALUES ($1, $2, $3, $4::text::timestamptz, $5::text::timestamptz)`, [owner, kind, source, from, until]);
  try {
    // Unique test roles preserve all migration grants/revokes without changing real roles.
    // The dedicated DB connection must be able to create roles including BYPASSRLS.
    for (const [kind, role] of Object.entries(roles)) {
      await sql.unsafe(`CREATE ROLE "${role}" NOLOGIN ${kind === "service_role" ? "BYPASSRLS" : "NOBYPASSRLS"}`);
    }
    await sql.unsafe(`CREATE SCHEMA "${schema}"; CREATE TABLE "${schema}".users (id uuid PRIMARY KEY)`);
    await sql.unsafe(`GRANT USAGE ON SCHEMA "${schema}" TO ${Object.values(roles).map((role) => `"${role}"`).join(", ")}`);
    const source = await readFile(new URL("../../drizzle/80-personal-plan-grant-foundation.sql", import.meta.url), "utf8");
    let isolated = source.replaceAll("public.", `"${schema}".`);
    for (const [kind, role] of Object.entries(roles)) isolated = isolated.replaceAll(new RegExp(`\\b${kind}\\b`, "g"), `"${role}"`);
    await sql.unsafe(isolated);
    await sql.unsafe(`INSERT INTO "${schema}".users VALUES ($1), ($2)`, [user, other]);
    await insert("start-inclusive");
    await assert.rejects(insert("start-inclusive", "full", now, "2026-11-01", other), { code: "23505" });
    await insert("full-overlap", "full");
    await insert("same-kind-overlap");
    for (const source of ["", "   ", " padded ", "\t", "\n", "\tleading"]) await assert.rejects(insert(source), { code: "23514" });
    await assert.rejects(insert("bad-kind", "plus"), { code: "23514" });
    await assert.rejects(insert("zero", "style", now, now), { code: "23514" });
    await assert.rejects(insert("infinite", "style", now, "infinity"), { code: "23514" });
    await assert.rejects(insert("infinite-start", "style", "-infinity"), { code: "23514" });
    await insert("end-exclusive", "style", "2026-09-01", now);
    await insert("future", "full", "2026-10-02");
    await insert("revoked");
    await sql.unsafe(`UPDATE "${schema}".personal_plan_grants SET revoked_at = $1 WHERE source_reference = 'revoked'`, [now]);
    await insert("other-user", "full", now, "2026-11-01", other);
    const [{ grants }] = await sql.unsafe(`SELECT "${schema}".load_active_personal_plan_grants($1, $2) AS grants`, [user, now]);
    assert.equal(grants.length, 3);
    assert.deepEqual(new Set(grants.map((row) => row.plan_kind)), new Set(["style", "full"]));
    assert.ok(grants.every((row) => row.user_id === user));
    assert.doesNotMatch(JSON.stringify(grants), /source_reference|start-inclusive/);
    const [{ enabled }] = await sql.unsafe(`SELECT relrowsecurity AS enabled FROM pg_class WHERE oid = $1::regclass`, [`${schema}.personal_plan_grants`]);
    assert.equal(enabled, true);
    for (const [kind, role] of Object.entries(roles)) {
      const [{ tableAccess, execute }] = await sql.unsafe(`SELECT has_table_privilege($1, $2, 'SELECT,INSERT,UPDATE,DELETE') AS "tableAccess",
        has_function_privilege($1, $3, 'EXECUTE') AS execute`, [role, `${schema}.personal_plan_grants`, `${schema}.load_active_personal_plan_grants(uuid,timestamptz)`]);
      assert.equal(tableAccess, kind === "service_role");
      assert.equal(execute, kind === "service_role");
      if (kind === "service_role") {
        await sql.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE "${role}"`);
          const [{ grants: trusted }] = await tx.unsafe(`SELECT "${schema}".load_active_personal_plan_grants($1, $2) AS grants`, [user, now]);
          assert.equal(trusted.length, 3);
          assert.equal((await tx.unsafe(`SELECT * FROM "${schema}".personal_plan_grants`)).length, 7);
        });
      } else {
        // A denied statement aborts its transaction; assert the whole rejection.
        await assert.rejects(sql.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE "${role}"`);
          await tx.unsafe(`SELECT * FROM "${schema}".personal_plan_grants`);
        }), { code: "42501" });
        await assert.rejects(sql.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE "${role}"`);
          await tx.unsafe(`SELECT "${schema}".load_active_personal_plan_grants($1, $2)`, [user, now]);
        }), { code: "42501" });
      }
    }
    // Even an accidental SELECT grant cannot bypass RLS in a browser role.
    await sql.unsafe(`GRANT SELECT ON "${schema}".personal_plan_grants TO "${roles.authenticated}"`);
    await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL ROLE "${roles.authenticated}"`);
      assert.deepEqual(await tx.unsafe(`SELECT * FROM "${schema}".personal_plan_grants`).then((rows) => [...rows]), []);
    });
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    for (const role of Object.values(roles)) await sql.unsafe(`DROP ROLE IF EXISTS "${role}"`);
    await sql.end();
  }
});
