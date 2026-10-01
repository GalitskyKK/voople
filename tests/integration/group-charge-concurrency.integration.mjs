import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();

test("Group charge schema enforces uniqueness, root assignment and snapshot validity", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured; production is never used",
  timeout: 30_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
  if (!loopback && !(process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true"
    && parsed.pathname.toLowerCase().includes("test"))) {
    throw new Error("Dedicated loopback or explicitly approved remote test database required");
  }
  const schema = `voople_grade_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 4, prepare: false });
  const owner = crypto.randomUUID();
  const group = crypto.randomUUID();
  const section = crypto.randomUUID();
  const direct = crypto.randomUUID();
  const now = "2026-10-01T12:00:00Z";
  const issue = (source, origin = "standalone", root = group, from = "2026-09-01", until = "2026-11-01") => sql.unsafe(`
    INSERT INTO "${schema}".group_charges
      (owner_user_id, root_group_id, origin, source_reference, valid_from, valid_until, assigned_at, moved_at)
    VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id
  `, [owner, root, origin, source, from, until]);
  try {
    await sql.unsafe(`CREATE SCHEMA "${schema}";
      CREATE TABLE "${schema}".users (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chats (id uuid PRIMARY KEY, type text NOT NULL, parent_chat_id uuid);`);
    const source = await readFile(new URL("../../drizzle/79-group-grade-foundation.sql", import.meta.url), "utf8");
    // Schema-isolated fixtures exercise the actual migration DDL/functions.
    // Deployment grants are checked statically; no global roles are created here.
    const isolated = source.replace(/^(REVOKE|GRANT).*;$/gm, "")
      .replaceAll("public.", `"${schema}".`)
      .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`);
    await sql.unsafe(isolated);
    await sql.unsafe(`INSERT INTO "${schema}".users VALUES ($1)`, [owner]);
    await sql.unsafe(`INSERT INTO "${schema}".chats VALUES ($1, 'group', NULL), ($2, 'group', $1), ($3, 'direct', NULL)`, [group, section, direct]);

    const duplicate = await Promise.allSettled([issue("same-source"), issue("same-source")]);
    assert.equal(duplicate.filter((result) => result.status === "fulfilled").length, 1);
    const included = await Promise.allSettled([
      issue("included-a", "included_voople_plus"), issue("included-b", "included_voople_plus"),
    ]);
    assert.equal(included.filter((result) => result.status === "fulfilled").length, 1);
    await issue("standalone-a");
    await issue("standalone-b");
    await assert.rejects(issue("section", "standalone", section), /group_charge_root_required/);
    await assert.rejects(issue("direct", "standalone", direct), /group_charge_root_required/);
    await assert.rejects(issue("invalid-window", "standalone", group, "2026-11-01", "2026-09-01"), /group_charges_validity/);
    await assert.rejects(sql.unsafe(`UPDATE "${schema}".chats SET parent_chat_id = $1 WHERE id = $2`, [section, group]), /group_charge_root_required/);

    await issue("future", "standalone", group, "2026-10-02", "2026-11-01");
    await issue("expired", "standalone", group, "2026-09-01", now);
    await issue("unassigned", "standalone", null);
    await issue("revoked");
    await sql.unsafe(`UPDATE "${schema}".group_charges SET revoked_at = now() WHERE source_reference = 'revoked'`);
    const snapshot = await sql.unsafe(`SELECT "${schema}".load_active_group_charges($1, $2) AS charges`, [group, now]);
    assert.equal(snapshot[0].charges.length, 4);
    const other = await sql.unsafe(`SELECT "${schema}".load_active_group_charges($1, $2) AS charges`, [section, now]);
    assert.deepEqual(other[0].charges, []);
    await sql.unsafe(`UPDATE "${schema}".group_charges SET revoked_at = now() WHERE origin = 'included_voople_plus'`);
    await issue("replacement-included", "included_voople_plus");
    await sql.unsafe(`DELETE FROM "${schema}".chats WHERE id = $1`, [group]);
    const [{ assigned }] = await sql.unsafe(`SELECT count(*)::integer AS assigned FROM "${schema}".group_charges WHERE root_group_id IS NOT NULL`);
    assert.equal(assigned, 0);
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await sql.end();
  }
});
