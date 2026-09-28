import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();

test("bounded grace maintenance archives only expired, empty temporary Rooms", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 30_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  const local = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  assert.ok(local || process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && parsed.pathname.toLowerCase().includes("test"), "A dedicated test database is required");

  const schema = `voople_grace_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 2, prepare: false });
  const roomId = "30000000-0000-4000-8000-000000000001";
  const sessionId = "40000000-0000-4000-8000-000000000001";
  try {
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    await sql.unsafe(`
      CREATE TABLE "${schema}".group_rooms (
        id uuid PRIMARY KEY, kind varchar NOT NULL, archived_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".live_sessions (
        id uuid PRIMARY KEY, room_id uuid NOT NULL, status varchar NOT NULL,
        empty_since timestamptz, ended_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".live_session_participants (
        session_id uuid NOT NULL, left_at timestamptz, last_seen_at timestamptz NOT NULL
      );
      CREATE TABLE "${schema}".live_session_guests (
        live_session_id uuid NOT NULL, left_at timestamptz, converted_at timestamptz,
        last_seen_at timestamptz NOT NULL, access_expires_at timestamptz NOT NULL
      );
      INSERT INTO "${schema}".group_rooms (id, kind) VALUES ('${roomId}', 'temporary');
      INSERT INTO "${schema}".live_sessions (id, room_id, status, empty_since)
      VALUES ('${sessionId}', '${roomId}', 'grace', now());
    `);
    const source = await readFile(new URL("../../drizzle/75-group-room-grace-maintenance.sql", import.meta.url), "utf8");
    const body = source.slice(0, source.indexOf("REVOKE ALL ON FUNCTION"))
      .replaceAll("public.", `"${schema}".`)
      .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`);
    await sql.unsafe(body);
    const expire = async () => {
      const [row] = await sql.unsafe(`SELECT "${schema}".expire_group_room_grace_bounded(1) AS expired`);
      return row.expired;
    };

    assert.equal(await expire(), 0, "newly empty Room remains in grace");
    await sql.unsafe(`UPDATE "${schema}".live_sessions SET empty_since = now() - interval '2 minutes'`);
    await sql.unsafe(`INSERT INTO "${schema}".live_session_guests VALUES ('${sessionId}', NULL, NULL, now(), now() + interval '1 hour')`);
    assert.equal(await expire(), 0, "fresh guest prevents archive");
    await sql.unsafe(`UPDATE "${schema}".live_session_guests SET left_at = now()`);
    assert.equal(await expire(), 1);
    const [room] = await sql.unsafe(`SELECT archived_at FROM "${schema}".group_rooms WHERE id = '${roomId}'`);
    const [session] = await sql.unsafe(`SELECT ended_at FROM "${schema}".live_sessions WHERE id = '${sessionId}'`);
    assert.ok(room.archived_at);
    assert.ok(session.ended_at);
    assert.equal(await expire(), 0, "maintenance is idempotent");
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});
