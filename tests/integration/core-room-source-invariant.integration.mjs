import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();

function migrationBody(source, stopMarker, schema) {
  const stop = source.indexOf(stopMarker);
  assert.notEqual(stop, -1);
  return source.slice(0, stop)
    .replaceAll("public.", `"${schema}".`)
    .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`);
}

async function rejectsSource(sql, query, error = "ROOM_SOURCE_INACTIVE") {
  await assert.rejects(sql.unsafe(query), (cause) => {
    assert.match(String(cause?.message), new RegExp(error));
    return true;
  });
}

test("Split RPC validates fresh actor membership and Voop's bound source", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 30_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  const local = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  assert.ok(local || process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && parsed.pathname.toLowerCase().includes("test"), "A dedicated test database is required");

  const schema = `voople_split_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 4, prepare: false });
  const group = "20000000-0000-4000-8000-000000000001";
  const otherGroup = "20000000-0000-4000-8000-000000000002";
  const users = Array.from({ length: 7 }, (_, index) => `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
  const request = (index) => `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

  try {
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    await sql.unsafe(`
      CREATE TABLE "${schema}".users (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chats (id uuid PRIMARY KEY, type varchar(20) NOT NULL, parent_chat_id uuid);
      CREATE TABLE "${schema}".chat_members (chat_id uuid NOT NULL, user_id uuid NOT NULL, role varchar(20) NOT NULL, PRIMARY KEY (chat_id, user_id));
      CREATE TABLE "${schema}".messages (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chat_rooms (chat_id uuid PRIMARY KEY, status varchar(20) NOT NULL, ended_at timestamp, updated_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE "${schema}".chat_room_participants (chat_id uuid NOT NULL, user_id uuid NOT NULL, PRIMARY KEY (chat_id, user_id), UNIQUE (user_id));
      CREATE TABLE "${schema}".chat_room_invites (
        id uuid PRIMARY KEY, chat_id uuid NOT NULL, room_session_id uuid NOT NULL,
        inviter_id uuid NOT NULL, invitee_id uuid NOT NULL, status varchar(20) NOT NULL,
        expires_at timestamp NOT NULL, intent varchar(20) NOT NULL
      );
      INSERT INTO "${schema}".users (id) VALUES ${users.map((id) => `('${id}')`).join(",")};
      INSERT INTO "${schema}".chats (id, type) VALUES ('${group}', 'group'), ('${otherGroup}', 'group');
      INSERT INTO "${schema}".chat_members (chat_id, user_id, role) VALUES
        ${users.map((id) => `('${group}', '${id}', 'member')`).join(",")},
        ('${otherGroup}', '${users[6]}', 'member');
    `);

    const [foundation, mutations, atomic, sourceGuard] = await Promise.all([
      "59-core-room-foundation.sql", "60-core-room-mutations.sql",
      "61-core-room-create-and-join.sql", "73-core-room-source-invariant.sql",
    ].map((name) => readFile(new URL(`../../drizzle/${name}`, import.meta.url), "utf8")));
    await sql.unsafe(migrationBody(foundation, "ALTER TABLE public.group_rooms ENABLE ROW LEVEL SECURITY;", schema));
    await sql.unsafe(migrationBody(mutations, "REVOKE ALL ON FUNCTION public.create_group_room", schema));
    await sql.unsafe(migrationBody(atomic, "REVOKE ALL ON FUNCTION public.create_and_join_group_room", schema));
    await sql.unsafe(migrationBody(sourceGuard, "REVOKE ALL ON FUNCTION public.create_and_join_group_room", schema));

    const [{ id: lobby }] = await sql.unsafe(`SELECT id FROM "${schema}".group_rooms WHERE group_chat_id = '${group}' AND kind = 'lobby'`);
    const [{ id: otherLobby }] = await sql.unsafe(`SELECT id FROM "${schema}".group_rooms WHERE group_chat_id = '${otherGroup}' AND kind = 'lobby'`);
    const join = (room, user) => `SELECT "${schema}".join_group_room('${room}', '${user}', true, false) AS result`;
    const split = (user, id) => `SELECT "${schema}".create_and_join_group_room('${group}', '${user}', 'temporary', 'Сплит', '${id}', true, false) AS result`;

    const [{ result: lobbyJoin }] = await sql.unsafe(join(lobby, users[0]));
    const [{ result: created }] = await sql.unsafe(split(users[0], request(1)));
    assert.equal(created.join.previousSessionId, lobbyJoin.sessionId);
    assert.equal(created.join.switched, true);
    const [{ result: retry }] = await sql.unsafe(split(users[0], request(1)));
    assert.equal(retry.room.id, created.room.id);

    await sql.unsafe(`INSERT INTO "${schema}".chat_room_invites (id, chat_id, room_session_id, inviter_id, invitee_id, status, expires_at, intent) VALUES ('${request(7)}', '${group}', '${created.join.sessionId}', '${users[0]}', '${users[5]}', 'pending', now() + interval '10 minutes', 'voop')`);
    const [{ result: acceptedVoop }] = await sql.unsafe(split(users[5], request(7)));
    assert.equal(acceptedVoop.room.kind, "temporary");

    const [{ result: staleJoin }] = await sql.unsafe(join(lobby, users[1]));
    await sql.unsafe(`UPDATE "${schema}".live_session_participants SET last_seen_at = now() - interval '10 minutes' WHERE session_id = '${staleJoin.sessionId}' AND user_id = '${users[1]}'`);
    await rejectsSource(sql, split(users[1], request(2)));

    const [{ result: leftJoin }] = await sql.unsafe(join(lobby, users[2]));
    await sql.unsafe(`UPDATE "${schema}".live_session_participants SET left_at = now() WHERE session_id = '${leftJoin.sessionId}' AND user_id = '${users[2]}'`);
    await rejectsSource(sql, split(users[2], request(3)));

    await sql.unsafe(join(lobby, users[3]));
    await sql.unsafe(`DELETE FROM "${schema}".chat_members WHERE chat_id = '${group}' AND user_id = '${users[3]}'`);
    await rejectsSource(sql, split(users[3], request(4)), "ROOM_FORBIDDEN");

    const [{ result: foreignJoin }] = await sql.unsafe(join(otherLobby, users[6]));
    await sql.unsafe(`INSERT INTO "${schema}".chat_room_invites (id, chat_id, room_session_id, inviter_id, invitee_id, status, expires_at, intent) VALUES ('${request(5)}', '${group}', '${foreignJoin.sessionId}', '${users[6]}', '${users[4]}', 'pending', now() + interval '10 minutes', 'voop')`);
    await rejectsSource(sql, split(users[4], request(5)));

    await sql.unsafe(`UPDATE "${schema}".live_sessions SET status = 'ended', ended_at = now() WHERE id = '${staleJoin.sessionId}'`);
    await rejectsSource(sql, split(users[1], request(6)));
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});

test("the source guard is part of the existing atomic RPC and migration ledger", async () => {
  const [guard, manifest, voopData] = await Promise.all([
    readFile(new URL("../../drizzle/73-core-room-source-invariant.sql", import.meta.url), "utf8"),
    readFile(new URL("../../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../src/server/data/core-room-invitations-rest.ts", import.meta.url), "utf8"),
  ]);
  assert.match(guard, /CREATE OR REPLACE FUNCTION public\.create_and_join_group_room/);
  assert.match(guard, /participant\.left_at IS NULL/);
  assert.match(guard, /participant\.last_seen_at > now\(\) - interval '120 seconds'/);
  assert.match(guard, /session\.conversation_id = p_group_chat_id/);
  assert.match(guard, /v_voop\.room_session_id/);
  assert.match(guard, /ROOM_SOURCE_INACTIVE/);
  assert.equal(manifest.match(/73-core-room-source-invariant\.sql/g)?.length, 2);
  assert.match(voopData, /\.gt\("last_seen_at", new Date\(Date\.now\(\) - 120_000\)/);
});
