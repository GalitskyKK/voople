import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();

test("Room archive rejects Lobby and live members/guests, but releases stale occupancy", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 30_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  const local = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  assert.ok(local || process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && parsed.pathname.toLowerCase().includes("test"), "A dedicated test database is required");

  const schema = `voople_archive_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 2, prepare: false });
  const group = "20000000-0000-4000-8000-000000000001";
  const owner = "10000000-0000-4000-8000-000000000001";
  const creator = "10000000-0000-4000-8000-000000000002";
  const lobby = "30000000-0000-4000-8000-000000000001";
  const room = "30000000-0000-4000-8000-000000000002";
  const pinned = "30000000-0000-4000-8000-000000000003";
  const session = "40000000-0000-4000-8000-000000000001";
  const call = (target, actor) => sql.unsafe(`SELECT "${schema}".archive_group_room('${target}', '${actor}')`);

  try {
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    await sql.unsafe(`
      CREATE TABLE "${schema}".group_rooms (
        id uuid PRIMARY KEY, group_chat_id uuid NOT NULL, kind varchar NOT NULL,
        name varchar NOT NULL, created_by uuid, archived_at timestamp, updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".chat_members (chat_id uuid NOT NULL, user_id uuid NOT NULL, role varchar NOT NULL);
      CREATE TABLE "${schema}".live_sessions (
        id uuid PRIMARY KEY, room_id uuid NOT NULL, status varchar NOT NULL,
        ended_at timestamp, updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".live_session_participants (
        session_id uuid NOT NULL, user_id uuid NOT NULL, last_seen_at timestamp NOT NULL,
        left_at timestamp
      );
      CREATE TABLE "${schema}".live_session_guests (
        live_session_id uuid NOT NULL, last_seen_at timestamptz NOT NULL,
        access_expires_at timestamptz NOT NULL, left_at timestamptz, converted_at timestamptz
      );
      INSERT INTO "${schema}".group_rooms (id, group_chat_id, kind, name, created_by) VALUES
        ('${lobby}', '${group}', 'lobby', 'Лобби', '${owner}'),
        ('${room}', '${group}', 'temporary', 'Сплит', '${creator}'),
        ('${pinned}', '${group}', 'pinned', 'Закреплённая', '${creator}');
      INSERT INTO "${schema}".chat_members VALUES ('${group}', '${owner}', 'owner'), ('${group}', '${creator}', 'member');
      INSERT INTO "${schema}".live_sessions (id, room_id, status) VALUES ('${session}', '${room}', 'active');
    `);
    const source = await readFile(new URL("../../drizzle/74-group-room-archive-presence.sql", import.meta.url), "utf8");
    const body = source.slice(0, source.indexOf("REVOKE ALL ON FUNCTION"))
      .replaceAll("public.", `"${schema}".`)
      .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`);
    await sql.unsafe(body);

    await assert.rejects(call(lobby, owner), /ROOM_NOT_FOUND/);
    await assert.rejects(call(pinned, creator), /ROOM_FORBIDDEN/);
    await sql.unsafe(`INSERT INTO "${schema}".live_session_participants VALUES ('${session}', '${creator}', now(), NULL)`);
    await assert.rejects(call(room, creator), /ROOM_NOT_EMPTY/);
    await sql.unsafe(`UPDATE "${schema}".live_session_participants SET last_seen_at = now() - interval '10 minutes'`);
    await sql.unsafe(`INSERT INTO "${schema}".live_session_guests VALUES ('${session}', now(), now() + interval '1 hour', NULL, NULL)`);
    await assert.rejects(call(room, creator), /ROOM_NOT_EMPTY/);
    await sql.unsafe(`UPDATE "${schema}".live_session_guests SET last_seen_at = now() - interval '10 minutes'`);
    const [{ archive_group_room: archived }] = await call(room, creator);
    assert.equal(archived, true);
    const [{ archived_at: archivedAt }] = await sql.unsafe(`SELECT archived_at FROM "${schema}".group_rooms WHERE id = '${room}'`);
    assert.ok(archivedAt);
    const [{ ended_at: endedAt }] = await sql.unsafe(`SELECT ended_at FROM "${schema}".live_sessions WHERE id = '${session}'`);
    assert.ok(endedAt);
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});
