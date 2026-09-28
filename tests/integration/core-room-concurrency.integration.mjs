import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
const allowRemote = process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true";

function assertDedicatedTestDatabase(value) {
  const parsed = new URL(value);
  const loopback = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  const testNamed = parsed.pathname.toLowerCase().includes("test");
  if (!loopback && !(allowRemote && testNamed)) {
    throw new Error(
      "Core Room concurrency tests require loopback Postgres. A remote database also needs "
      + "VOOPLE_ALLOW_REMOTE_TEST_DATABASE=true and a database name containing 'test'.",
    );
  }
}

function migrationBody(source, stopMarker, schema) {
  const stop = source.indexOf(stopMarker);
  assert.notEqual(stop, -1, `Migration stop marker is missing: ${stopMarker}`);
  return source
    .slice(0, stop)
    .replaceAll("public.", `"${schema}".`)
    .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`);
}

async function expectDatabaseError(operation, code) {
  await assert.rejects(operation, (error) => {
    assert.match(error instanceof Error ? error.message : String(error), new RegExp(code));
    return true;
  });
}

test("atomic core Room create + join survives concurrent retries", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 30_000,
}, async () => {
  assertDedicatedTestDatabase(databaseUrl);
  const schema = `voople_core_room_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 8, prepare: false });
  const userId = "10000000-0000-4000-8000-000000000001";
  const firstGroupId = "20000000-0000-4000-8000-000000000001";
  const secondGroupId = "20000000-0000-4000-8000-000000000002";
  const firstRequestId = "30000000-0000-4000-8000-000000000001";
  const secondRequestId = "30000000-0000-4000-8000-000000000002";

  try {
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    await sql.unsafe(`
      CREATE TABLE "${schema}".users (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chats (
        id uuid PRIMARY KEY,
        type varchar(20) NOT NULL,
        parent_chat_id uuid REFERENCES "${schema}".chats(id)
      );
      CREATE TABLE "${schema}".chat_members (
        chat_id uuid NOT NULL REFERENCES "${schema}".chats(id),
        user_id uuid NOT NULL REFERENCES "${schema}".users(id),
        role varchar(20) NOT NULL,
        PRIMARY KEY (chat_id, user_id)
      );
      CREATE TABLE "${schema}".messages (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chat_rooms (
        chat_id uuid PRIMARY KEY REFERENCES "${schema}".chats(id),
        status varchar(20) NOT NULL,
        ended_at timestamp,
        updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".chat_room_participants (
        chat_id uuid NOT NULL REFERENCES "${schema}".chats(id),
        user_id uuid NOT NULL REFERENCES "${schema}".users(id),
        PRIMARY KEY (chat_id, user_id),
        UNIQUE (user_id)
      );
      INSERT INTO "${schema}".users (id) VALUES ('${userId}');
      INSERT INTO "${schema}".chats (id, type) VALUES
        ('${firstGroupId}', 'group'),
        ('${secondGroupId}', 'group');
      INSERT INTO "${schema}".chat_members (chat_id, user_id, role) VALUES
        ('${firstGroupId}', '${userId}', 'owner'),
        ('${secondGroupId}', '${userId}', 'owner');
    `);

    const [foundation, mutations, atomicCreate] = await Promise.all([
      readFile(new URL("../../drizzle/59-core-room-foundation.sql", import.meta.url), "utf8"),
      readFile(new URL("../../drizzle/60-core-room-mutations.sql", import.meta.url), "utf8"),
      readFile(new URL("../../drizzle/61-core-room-create-and-join.sql", import.meta.url), "utf8"),
    ]);
    await sql.unsafe(migrationBody(
      foundation,
      "ALTER TABLE public.group_rooms ENABLE ROW LEVEL SECURITY;",
      schema,
    ));
    await sql.unsafe(migrationBody(
      mutations,
      "REVOKE ALL ON FUNCTION public.create_group_room",
      schema,
    ));
    await sql.unsafe(migrationBody(
      atomicCreate,
      "REVOKE ALL ON FUNCTION public.create_and_join_group_room",
      schema,
    ));

    const firstCall = `SELECT "${schema}".create_and_join_group_room(
      '${firstGroupId}', '${userId}', 'temporary', 'Design sync',
      '${firstRequestId}', true, false
    ) AS result`;
    const concurrentResults = await Promise.all(
      Array.from({ length: 6 }, () => sql.unsafe(firstCall)),
    );
    const payloads = concurrentResults.map(([row]) => row.result);
    assert.equal(new Set(payloads.map((payload) => payload.room.id)).size, 1);
    assert.equal(new Set(payloads.map((payload) => payload.join.sessionId)).size, 1);

    const [firstCounts] = await sql.unsafe(`
      SELECT
        (SELECT count(*)::int FROM "${schema}".group_rooms
          WHERE creation_request_id = '${firstRequestId}') AS rooms,
        (SELECT count(*)::int FROM "${schema}".live_sessions
          WHERE ended_at IS NULL AND room_id = '${payloads[0].room.id}') AS sessions,
        (SELECT count(*)::int FROM "${schema}".live_session_participants
          WHERE user_id = '${userId}' AND left_at IS NULL) AS participants
    `);
    assert.deepEqual(firstCounts, { rooms: 1, sessions: 1, participants: 1 });

    await expectDatabaseError(
      sql.unsafe(firstCall.replace("Design sync", "Different room")),
      "ROOM_IDEMPOTENCY_CONFLICT",
    );

    const blockedSwitch = `SELECT "${schema}".create_and_join_group_room(
      '${secondGroupId}', '${userId}', 'temporary', 'Other group',
      '${secondRequestId}', true, false
    ) AS result`;
    await expectDatabaseError(sql.unsafe(blockedSwitch), "ROOM_CONTEXT_CONFIRMATION_REQUIRED");
    const [rolledBack] = await sql.unsafe(`SELECT count(*)::int AS rooms
      FROM "${schema}".group_rooms WHERE creation_request_id = '${secondRequestId}'`);
    assert.equal(rolledBack.rooms, 0);

    const [switched] = await sql.unsafe(blockedSwitch.replace("true, false", "true, true"));
    assert.equal(switched.result.join.switched, true);
    assert.equal(switched.result.join.previousSessionId, payloads[0].join.sessionId);
    const [activeParticipant] = await sql.unsafe(`SELECT count(*)::int AS participants
      FROM "${schema}".live_session_participants
      WHERE user_id = '${userId}' AND left_at IS NULL`);
    assert.equal(activeParticipant.participants, 1);
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});
