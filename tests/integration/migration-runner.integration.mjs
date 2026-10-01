import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";
import { applyMigration, LEDGER_BOOTSTRAP } from "../../scripts/migration-runner.mjs";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
if (process.env.CI === "true" && !databaseUrl) {
  throw new Error("CI requires VOOPLE_TEST_DATABASE_URL; database integration must not skip or use production credentials");
}
test("migration runner proves atomic DDL/ledger, bootstrap, concurrency and enum installation", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL absent; no production fallback",
  timeout: 60_000,
}, async () => {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    && !(process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && url.pathname.toLowerCase().includes("test"))) {
    throw new Error("Dedicated loopback or explicitly approved remote test database required");
  }
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const schema = `migration_test_${suffix}`;
  const roles = Object.fromEntries(["anon", "authenticated", "service_role"].map((role) => [role, `${role}_${suffix}`]));
  const sql = postgres(databaseUrl, { max: 3, prepare: false, connect_timeout: 5,
    connection: { statement_timeout: 10_000, lock_timeout: 5_000 } });
  function isolate(source) {
    let result = source.replaceAll("public.", `"${schema}".`)
      .replaceAll("table_schema = 'public'", `table_schema = '${schema}'`)
      .replaceAll("search_path = public", `search_path = "${schema}"`);
    for (const [role, isolated] of Object.entries(roles)) result = result.replaceAll(new RegExp(`\\b${role}\\b`, "g"), `"${isolated}"`);
    return result;
  }
  // Exercise the actual runner, translating its qualified ledger queries into the
  // disposable schema. Values stay parameters; no real public objects are touched.
  const isolatedClient = { begin: (run) => sql.begin(async (tx) => {
    const adapter = (strings, ...values) => tx.unsafe(isolate(strings.reduce((text, part, i) => text + (i ? `$${i}` : "") + part, "")), values);
    adapter.unsafe = (source) => tx.unsafe(isolate(source));
    return run(adapter);
  }) };
  const apply = (file, source, releaseVersion = "1.2.3") => applyMigration(isolatedClient, { file, source, releaseVersion });
  const ledger = () => sql.unsafe(`SELECT * FROM "${schema}".app_schema_migrations ORDER BY id`);
  const bootstrap = await readFile(new URL("../../drizzle/45-app-schema-migrations.sql", import.meta.url), "utf8");
  try {
    for (const role of Object.values(roles)) await sql.unsafe(`CREATE ROLE "${role}" NOLOGIN`);
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    await assert.rejects(apply("80-personal-plan-grant-foundation.sql", "SELECT 1;"), /ledger is missing/);
    assert.equal((await apply(LEDGER_BOOTSTRAP, bootstrap)).status, "applied");
    const initial = await ledger();
    assert.equal(initial.length, 1);
    assert.equal((await apply(LEDGER_BOOTSTRAP, bootstrap, "9.9.9")).status, "already-applied");
    assert.deepEqual(await ledger(), initial);

    const file = "80-personal-plan-grant-foundation.sql";
    const broken = "CREATE TABLE public.rollback_fixture(id integer);\n--> statement-breakpoint\nSELECT 1/0;";
    await assert.rejects(apply(file, broken), { code: "22012" });
    const [{ missing }] = await sql.unsafe(`SELECT to_regclass('"${schema}".rollback_fixture') IS NULL AS missing`);
    assert.equal(missing, true);
    assert.deepEqual(await ledger(), initial);

    await sql.unsafe(`CREATE TABLE "${schema}".conflict_fixture(id integer)`);
    await assert.rejects(apply(file, "CREATE TABLE public.conflict_fixture(id integer);"), { code: "42P07" });
    assert.deepEqual(await ledger(), initial);

    const source = "CREATE TABLE public.once_fixture(id integer);";
    const results = await Promise.all([apply(file, source), apply(file, source)]);
    assert.deepEqual(results.map((result) => result.status).sort(), ["already-applied", "applied"]);
    const once = await ledger();
    assert.equal(once.filter((row) => row.id === file).length, 1);
    await assert.rejects(apply(file, source + " SELECT 1;"), /checksum mismatch/);
    assert.deepEqual(await ledger(), once);

    // Existing ledger without a bootstrap record: 45 adds only its own record;
    // detection remains explicit, and pre-existing migration metadata survives.
    await sql.unsafe(`DELETE FROM "${schema}".app_schema_migrations WHERE id = $1`, [LEDGER_BOOTSTRAP]);
    await sql.unsafe(`CREATE TABLE "${schema}".group_emojis(id integer);
      CREATE TABLE "${schema}".group_sounds(id integer);
      CREATE TABLE "${schema}".messages(content jsonb)`);
    assert.equal((await apply(LEDGER_BOOTSTRAP, bootstrap)).status, "applied");
    const detected = await ledger();
    const legacy = detected.filter((row) => row.checksum === "legacy-detected");
    assert.deepEqual(legacy.map((row) => row.id), ["38-group-emojis.sql", "39-structured-chat-content.sql", "43-group-sounds.sql"]);
    assert.ok(legacy.every((row) => row.release_version === "pre-ledger"));
    assert.deepEqual(detected.find((row) => row.id === file), once.find((row) => row.id === file));
    await assert.rejects(apply(legacy[0].id, "SELECT 1;"), /verified adoption/);
    assert.deepEqual(await ledger(), detected);

    // Run unchanged enum-adding migration bodies against isolated prerequisites.
    await sql.unsafe(`CREATE TYPE "${schema}".notif_type AS ENUM ('like');
      CREATE TABLE "${schema}".users(id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chats(id uuid PRIMARY KEY, type text);
      CREATE TABLE "${schema}".chat_rooms(id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chat_members(chat_id uuid, user_id uuid);
      CREATE TABLE "${schema}".user_blocks(blocker_id uuid, blocked_id uuid);
      CREATE TABLE "${schema}".user_contact_pins(user_id uuid, pinned_user_id uuid);
      CREATE TABLE "${schema}".user_privacy_settings(user_id uuid, connection_request_scope text);
      CREATE TABLE "${schema}".notifications(user_id uuid, type "${schema}".notif_type, actor_id uuid, reference_id uuid);
      CREATE FUNCTION "${schema}".users_have_block(uuid, uuid) RETURNS boolean LANGUAGE sql AS 'SELECT false'`);
    for (const migration of ["58-room-invitations.sql", "77-friendships.sql"]) {
      const source = await readFile(new URL(`../../drizzle/${migration}`, import.meta.url), "utf8");
      assert.equal((await apply(migration, source)).status, "applied");
    }
    const [{ labels }] = await sql.unsafe(`SELECT enum_range(NULL::"${schema}".notif_type)::text AS labels`);
    assert.match(labels, /room_invite,friend_request,friend_accept/);
    // New labels are usable after the migration transaction has committed.
    await sql.unsafe(`INSERT INTO "${schema}".notifications(type) VALUES ('friend_request'), ('friend_accept'), ('room_invite')`);
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    for (const role of Object.values(roles)) await sql.unsafe(`DROP ROLE IF EXISTS "${role}"`);
    await sql.end({ timeout: 5 });
  }
});
