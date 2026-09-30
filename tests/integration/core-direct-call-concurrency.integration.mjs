import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();

function assertDedicatedTestDatabase(value) {
  const parsed = new URL(value);
  const loopback = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  if (!loopback && !(process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true"
    && parsed.pathname.toLowerCase().includes("test"))) {
    throw new Error("Core Direct Call integration tests require a dedicated test Postgres database");
  }
}

function inSchema(source, schema) {
  return source.replaceAll("public.", `"${schema}".`)
    .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`);
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.match(error.message, new RegExp(code));
    return true;
  });
}

test("Core Direct Call transactions serialize starts, answer, busy, terminal and retry", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 40_000,
}, async () => {
  assertDedicatedTestDatabase(databaseUrl);
  const schema = `voople_direct_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 8, prepare: false });
  const a = "10000000-0000-4000-8000-000000000001";
  const b = "10000000-0000-4000-8000-000000000002";
  const c = "10000000-0000-4000-8000-000000000003";
  const ab = "20000000-0000-4000-8000-000000000001";
  const bc = "20000000-0000-4000-8000-000000000002";
  const group = "20000000-0000-4000-8000-000000000003";
  const request = (n) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const start = (conversation, caller, id) => sql.unsafe(
    `SELECT "${schema}".start_core_direct_call('${conversation}', '${caller}', '${id}',
      '${caller === a ? b : caller === c ? b : a}') AS result`,
  ).then(([row]) => row.result);
  const answer = (session, recipient) => sql.unsafe(
    `SELECT "${schema}".answer_core_direct_call('${session}', '${recipient}') AS result`,
  ).then(([row]) => row.result);
  const finish = (session, actor) => sql.unsafe(
    `SELECT "${schema}".finish_core_direct_call('${session}', '${actor}') AS result`,
  ).then(([row]) => row.result);

  try {
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    await sql.unsafe(`
      CREATE TABLE "${schema}".users (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chats (id uuid PRIMARY KEY, type varchar(20) NOT NULL,
        parent_chat_id uuid REFERENCES "${schema}".chats(id));
      CREATE TABLE "${schema}".chat_members (chat_id uuid NOT NULL REFERENCES "${schema}".chats(id),
        user_id uuid NOT NULL REFERENCES "${schema}".users(id), role varchar(20) NOT NULL,
        PRIMARY KEY (chat_id, user_id));
      CREATE TABLE "${schema}".messages (id uuid PRIMARY KEY, chat_id uuid NOT NULL,
        sender_id uuid NOT NULL, text varchar(1000), content jsonb, created_at timestamp NOT NULL);
      CREATE TABLE "${schema}".user_blocks (blocker_id uuid NOT NULL, blocked_id uuid NOT NULL);
      CREATE TABLE "${schema}".chat_rooms (chat_id uuid PRIMARY KEY REFERENCES "${schema}".chats(id),
        status varchar(20) NOT NULL, ended_at timestamp, updated_at timestamp NOT NULL DEFAULT now());
      CREATE TABLE "${schema}".chat_room_participants (chat_id uuid NOT NULL REFERENCES "${schema}".chats(id),
        user_id uuid NOT NULL REFERENCES "${schema}".users(id), PRIMARY KEY (chat_id, user_id));
      INSERT INTO "${schema}".users (id) VALUES ('${a}'), ('${b}'), ('${c}');
      INSERT INTO "${schema}".chats (id, type) VALUES ('${ab}', 'direct'), ('${bc}', 'direct'), ('${group}', 'group');
      INSERT INTO "${schema}".chat_members (chat_id, user_id, role) VALUES
        ('${ab}', '${a}', 'member'), ('${ab}', '${b}', 'member'),
        ('${bc}', '${b}', 'member'), ('${bc}', '${c}', 'member'),
        ('${group}', '${b}', 'member');
    `);
    const foundation = await readFile(new URL("../../drizzle/59-core-room-foundation.sql", import.meta.url), "utf8");
    await sql.unsafe(inSchema(foundation.slice(0, foundation.indexOf("ALTER TABLE public.group_rooms ENABLE ROW LEVEL SECURITY;")), schema));
    const migration = await readFile(new URL("../../drizzle/78-core-direct-call-foundation.sql", import.meta.url), "utf8");
    const body = migration.slice(0, migration.indexOf("REVOKE ALL ON FUNCTION public.start_core_direct_call"))
      .replace(/CREATE POLICY direct_call_signals_self_read[\s\S]*?;\s*/, "")
      .replace(/DO \$\$ BEGIN\s*ALTER PUBLICATION supabase_realtime[\s\S]*?END \$\$;\s*/, "");
    await sql.unsafe(inSchema(body, schema));

    const retries = await Promise.all(Array.from({ length: 6 }, () => start(ab, a, request(1))));
    assert.equal(new Set(retries.map((result) => result.sessionId)).size, 1);
    const first = retries[0];
    assert.equal((await start(ab, a, request(2))).sessionId, first.sessionId);
    assert.equal((await start(ab, b, request(3))).sessionId, first.sessionId);
    await expectCode(start(bc, c, request(4)), "DIRECT_CALL_BUSY");
    const accepted = await answer(first.sessionId, b);
    assert.equal(accepted.status, "active");
    assert.equal((await answer(first.sessionId, b)).sessionId, first.sessionId);
    const [members] = await sql.unsafe(`SELECT count(*)::int AS count FROM "${schema}".live_session_participants
      WHERE session_id = '${first.sessionId}' AND left_at IS NULL`);
    assert.equal(members.count, 2);
    assert.deepEqual(await finish(first.sessionId, a), {
      sessionId: first.sessionId, reason: "ended", changed: true,
    });
    assert.equal((await finish(first.sessionId, b)).changed, false);
    const [history] = await sql.unsafe(`SELECT
      count(*) FILTER (WHERE content->0->>'event' = 'started')::int AS started,
      count(*) FILTER (WHERE content->0->>'event' = 'ended')::int AS ended
      FROM "${schema}".messages WHERE chat_id = '${ab}'`);
    assert.deepEqual(history, { started: 1, ended: 1 });

    const second = await start(ab, a, request(2));
    assert.notEqual(second.sessionId, first.sessionId);
    assert.notEqual(second.providerSessionId, first.providerSessionId);
    await expectCode(answer(first.sessionId, b), "DIRECT_CALL_EXPIRED");
    assert.equal((await finish(first.sessionId, b)).reason, "ended");
    assert.equal((await finish(second.sessionId, b)).reason, "declined");

    const third = await start(ab, a, request(5));
    await sql.unsafe(`UPDATE "${schema}".live_sessions SET ring_expires_at = now() - interval '1 second'
      WHERE id = '${third.sessionId}'`);
    const [expired] = await sql.unsafe(`SELECT "${schema}".expire_core_direct_calls(100) AS count`);
    assert.equal(expired.count, 1);
    const [missedHistory] = await sql.unsafe(`SELECT count(*)::int AS count FROM "${schema}".messages
      WHERE chat_id = '${ab}' AND content->0->>'event' = 'missed'`);
    assert.equal(missedHistory.count, 1);
    await expectCode(answer(third.sessionId, b), "DIRECT_CALL_EXPIRED");
    const fourth = await start(ab, a, request(6));
    assert.notEqual(fourth.sessionId, third.sessionId);
    await finish(fourth.sessionId, a);

    const cross = await Promise.all([start(ab, a, request(10)), start(ab, b, request(11))]);
    assert.equal(cross[0].sessionId, cross[1].sessionId);
    await finish(cross[0].sessionId, a);
    const competing = await Promise.allSettled([
      start(ab, a, request(12)), start(bc, c, request(13)),
    ]);
    assert.equal(competing.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(competing.filter((result) => result.status === "rejected").length, 1);
    const winningIndex = competing.findIndex((result) => result.status === "fulfilled");
    const winner = competing[winningIndex].value;
    await finish(winner.sessionId, winningIndex === 0 ? a : c);

    await sql.unsafe(`INSERT INTO "${schema}".user_blocks VALUES ('${a}', '${b}')`);
    await expectCode(start(ab, a, request(7)), "DIRECT_CALL_BLOCKED");
    await sql.unsafe(`DELETE FROM "${schema}".user_blocks`);
    const [lobby] = await sql.unsafe(`SELECT id FROM "${schema}".group_rooms
      WHERE group_chat_id = '${group}' AND kind = 'lobby'`);
    const [groupSession] = await sql.unsafe(`INSERT INTO "${schema}".live_sessions
      (conversation_id, room_id, kind, status, started_by)
      VALUES ('${group}', '${lobby.id}', 'group_room', 'active', '${b}') RETURNING id`);
    await sql.unsafe(`INSERT INTO "${schema}".live_session_participants (session_id, user_id)
      VALUES ('${groupSession.id}', '${b}')`);
    await expectCode(start(ab, a, request(8)), "DIRECT_CALL_BUSY");
    await sql.unsafe(`UPDATE "${schema}".live_session_participants SET left_at = now()
      WHERE session_id = '${groupSession.id}'`);
    await sql.unsafe(`UPDATE "${schema}".live_sessions SET status = 'ended', ended_at = now()
      WHERE id = '${groupSession.id}'`);
    await sql.unsafe(`INSERT INTO "${schema}".chat_room_participants VALUES ('${bc}', '${b}')`);
    await sql.unsafe(`INSERT INTO "${schema}".chat_rooms (chat_id, status) VALUES ('${bc}', 'active')`);
    await expectCode(start(ab, a, request(9)), "DIRECT_CALL_BUSY");
  } finally {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});
