import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();
const group = "20000000-0000-4000-8000-000000000001";
const lobby = "30000000-0000-4000-8000-000000000001";
const users = [1, 2, 3, 4].map((n) => `10000000-0000-4000-8000-00000000000${n}`);
const [a, b, c, d] = users;

test("Split and Voop consent finalize one atomic temporary Room", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 60_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  const local = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  assert.ok(local || process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && parsed.pathname.toLowerCase().includes("test"), "A dedicated test database is required");
  const schema = `voople_move_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 2, prepare: false });
  const q = (statement) => sql.unsafe(statement);
  const rpc = async (name, args) => {
    const [row] = await q(`SELECT "${schema}".${name}(${args}) AS result`);
    return row.result;
  };
  const request = (source, recipients, mode = "split") => rpc("request_live_move",
    `'${group}', '${a}', ARRAY[${recipients.map((id) => `'${id}'::uuid`).join(",")}], '${mode}', '${source}'`);
  const consent = async (requestId, userId) => {
    const [row] = await q(`SELECT id FROM "${schema}".live_move_consents WHERE request_id = '${requestId}' AND user_id = '${userId}'`);
    return row.id;
  };
  const respond = (id, userId, accept) => rpc("respond_live_move", `'${id}', '${userId}', ${accept}`);
  const roomCount = async () => Number((await q(`SELECT count(*) AS count FROM "${schema}".group_rooms WHERE kind = 'temporary'`))[0].count);
  const sourceSession = async () => {
    await q(`UPDATE "${schema}".live_session_participants SET left_at = now() WHERE left_at IS NULL`);
    const id = crypto.randomUUID();
    await q(`INSERT INTO "${schema}".live_sessions (id, conversation_id, room_id, kind, status, started_by)
      VALUES ('${id}', '${group}', '${lobby}', 'group_room', 'active', '${a}')`);
    await q(`INSERT INTO "${schema}".live_session_participants (session_id, user_id)
      VALUES ${users.map((userId) => `('${id}', '${userId}')`).join(",")}`);
    return id;
  };
  try {
    await q(`CREATE SCHEMA "${schema}"`);
    await q(`
      CREATE TABLE "${schema}".chats (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".users (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".chat_members (chat_id uuid, user_id uuid);
      CREATE TABLE "${schema}".group_rooms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_chat_id uuid NOT NULL,
        kind varchar NOT NULL, name varchar NOT NULL, created_by uuid,
        archived_at timestamp, updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".live_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL,
        room_id uuid, kind varchar NOT NULL, status varchar NOT NULL,
        started_by uuid NOT NULL, ended_at timestamp, empty_since timestamp,
        updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE "${schema}".live_session_participants (
        session_id uuid NOT NULL, user_id uuid NOT NULL, left_at timestamp,
        last_seen_at timestamp NOT NULL DEFAULT now(), mic_muted boolean NOT NULL DEFAULT true,
        PRIMARY KEY (session_id, user_id)
      );
      CREATE TABLE "${schema}".notifications (user_id uuid, type varchar, actor_id uuid, reference_id uuid);
      CREATE TABLE "${schema}".fail_moves (user_id uuid);
      INSERT INTO "${schema}".chats VALUES ('${group}');
      INSERT INTO "${schema}".users VALUES ${users.map((id) => `('${id}')`).join(",")};
      INSERT INTO "${schema}".chat_members VALUES ${users.map((id) => `('${group}', '${id}')`).join(",")};
      INSERT INTO "${schema}".group_rooms (id, group_chat_id, kind, name) VALUES ('${lobby}', '${group}', 'lobby', 'Лобби');
    `);
    await q(`
      CREATE FUNCTION "${schema}".create_group_room(uuid, uuid, varchar, varchar)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE v_id uuid;
      BEGIN
        INSERT INTO "${schema}".group_rooms (group_chat_id, kind, name, created_by)
        VALUES ($1, $3, $4, $2) RETURNING id INTO v_id;
        RETURN jsonb_build_object('id', v_id);
      END $$;
      CREATE FUNCTION "${schema}".join_group_room(uuid, uuid, boolean, boolean)
      RETURNS jsonb LANGUAGE plpgsql AS $$
      DECLARE v_session uuid; v_source uuid;
      BEGIN
        IF EXISTS (SELECT 1 FROM "${schema}".fail_moves WHERE user_id = $2) THEN
          RAISE EXCEPTION 'TEST_MOVE_FAILURE';
        END IF;
        SELECT session_id INTO v_source FROM "${schema}".live_session_participants
        WHERE user_id = $2 AND left_at IS NULL LIMIT 1;
        UPDATE "${schema}".live_session_participants SET left_at = now()
        WHERE user_id = $2 AND left_at IS NULL;
        SELECT id INTO v_session FROM "${schema}".live_sessions
        WHERE room_id = $1 AND ended_at IS NULL LIMIT 1;
        IF v_session IS NULL THEN
          INSERT INTO "${schema}".live_sessions (conversation_id, room_id, kind, status, started_by)
          VALUES ('${group}', $1, 'group_room', 'active', $2) RETURNING id INTO v_session;
        END IF;
        INSERT INTO "${schema}".live_session_participants (session_id, user_id, mic_muted)
        VALUES (v_session, $2, true);
        IF NOT EXISTS (SELECT 1 FROM "${schema}".live_session_participants WHERE session_id = v_source AND left_at IS NULL) THEN
          UPDATE "${schema}".live_sessions SET status = 'ended', ended_at = now() WHERE id = v_source;
        END IF;
        RETURN jsonb_build_object('sessionId', v_session);
      END $$;
    `);
    const migration = await readFile(new URL("../../drizzle/76-live-move-consent.sql", import.meta.url), "utf8");
    const body = migration
      .replaceAll("public.", `"${schema}".`)
      .replaceAll("SET search_path = public, pg_temp", `SET search_path = "${schema}", pg_temp`)
      .replace(/(?:REVOKE|GRANT)\s[\s\S]*?;/g, "");
    await q(body);

    const source = await sourceSession();
    const split = await request(source, [b, c]);
    assert.equal(await roomCount(), 0, "request is not a Room");
    const bConsent = await consent(split.id, b);
    const cConsent = await consent(split.id, c);
    assert.equal((await respond(bConsent, b, true)).status, "pending");
    assert.equal(await roomCount(), 0, "first acceptance moves nobody");
    const completed = await respond(cConsent, c, true);
    assert.equal(completed.status, "completed");
    assert.equal(await roomCount(), 1);
    for (const participant of [a, b, c]) {
      const status = await rpc("status_live_move", `'${split.id}', '${participant}'`);
      assert.equal(status.status, "completed");
      assert.equal(status.targetRoomId, completed.targetRoomId);
      assert.equal(status.targetSessionId, completed.targetSessionId);
    }
    await assert.rejects(rpc("status_live_move", `'${split.id}', '${d}'`), /LIVE_MOVE_FORBIDDEN/);
    const moved = await q(`SELECT user_id FROM "${schema}".live_session_participants WHERE session_id = '${completed.targetSessionId}' AND left_at IS NULL ORDER BY user_id`);
    assert.deepEqual(moved.map((row) => row.user_id).sort(), [a, b, c].sort());
    const [other] = await q(`SELECT session_id FROM "${schema}".live_session_participants WHERE user_id = '${d}' AND left_at IS NULL`);
    assert.equal(other.session_id, source);
    assert.equal((await respond(cConsent, c, true)).targetRoomId, completed.targetRoomId);
    assert.equal(await roomCount(), 1, "retry is idempotent");

    const declineSource = await sourceSession();
    const declined = await request(declineSource, [b, c]);
    assert.equal((await respond(await consent(declined.id, b), b, false)).status, "declined");
    assert.equal(await roomCount(), 1);
    const cancelledSource = await sourceSession();
    const cancelled = await request(cancelledSource, [b]);
    assert.equal((await rpc("cancel_live_move", `'${cancelled.id}', '${a}'`)).status, "cancelled");
    assert.equal(await roomCount(), 1);
    const expiredSource = await sourceSession();
    const expired = await request(expiredSource, [b]);
    await q(`UPDATE "${schema}".live_move_requests SET expires_at = now() - interval '1 minute' WHERE id = '${expired.id}'`);
    assert.equal((await respond(await consent(expired.id, b), b, true)).status, "expired");
    assert.equal(await roomCount(), 1);

    for (const actor of [a, b, c]) {
      const raceSource = await sourceSession();
      const race = await request(raceSource, [b, c]);
      await respond(await consent(race.id, b), b, true);
      await q(`UPDATE "${schema}".live_session_participants SET left_at = now() WHERE session_id = '${raceSource}' AND user_id = '${actor}'`);
      assert.equal((await respond(await consent(race.id, c), c, true)).status, "cancelled");
      assert.equal(await roomCount(), 1);
    }
    const switchedSource = await sourceSession();
    const switched = await request(switchedSource, [b, c]);
    await respond(await consent(switched.id, b), b, true);
    const alternateSession = crypto.randomUUID();
    await q(`INSERT INTO "${schema}".live_sessions (id, conversation_id, room_id, kind, status, started_by)
      VALUES ('${alternateSession}', '${group}', '${lobby}', 'group_room', 'active', '${c}')`);
    await q(`UPDATE "${schema}".live_session_participants SET session_id = '${alternateSession}'
      WHERE session_id = '${switchedSource}' AND user_id = '${b}'`);
    assert.equal((await respond(await consent(switched.id, c), c, true)).status, "cancelled");
    assert.equal(await roomCount(), 1);
    const endedSource = await sourceSession();
    const ended = await request(endedSource, [b]);
    await q(`UPDATE "${schema}".live_sessions SET status = 'ended', ended_at = now() WHERE id = '${endedSource}'`);
    assert.equal((await respond(await consent(ended.id, b), b, true)).status, "cancelled");
    assert.equal(await roomCount(), 1);

    const failingSource = await sourceSession();
    const failing = await request(failingSource, [b, c]);
    await respond(await consent(failing.id, b), b, true);
    await q(`INSERT INTO "${schema}".fail_moves VALUES ('${b}')`);
    await assert.rejects(respond(await consent(failing.id, c), c, true), /TEST_MOVE_FAILURE/);
    assert.equal(await roomCount(), 1, "transaction rolls back Room insert");
    const [placement] = await q(`SELECT session_id FROM "${schema}".live_session_participants WHERE user_id = '${a}' AND left_at IS NULL`);
    assert.equal(placement.session_id, failingSource);
    await q(`DELETE FROM "${schema}".fail_moves`);
    assert.equal((await respond(await consent(failing.id, c), c, true)).status, "completed");
    assert.equal(await roomCount(), 2);

    const voopSource = await sourceSession();
    const voop = await request(voopSource, [b], "voop");
    assert.equal(await roomCount(), 2);
    assert.equal((await respond(await consent(voop.id, b), b, true)).status, "completed");
    assert.equal(await roomCount(), 3);
  } finally {
    await q(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
});
