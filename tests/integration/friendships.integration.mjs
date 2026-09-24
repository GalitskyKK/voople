import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

const databaseUrl = process.env.VOOPLE_TEST_DATABASE_URL?.trim();

test("friend request, privacy, block and contact invariants hold in PostgreSQL", {
  skip: databaseUrl ? false : "VOOPLE_TEST_DATABASE_URL is not configured",
  timeout: 60_000,
}, async () => {
  const parsed = new URL(databaseUrl);
  const local = new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname);
  assert.ok(local || process.env.VOOPLE_ALLOW_REMOTE_TEST_DATABASE === "true" && parsed.pathname.toLowerCase().includes("test"), "A dedicated test database is required");
  const schema = `voople_friends_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const sql = postgres(databaseUrl, { max: 4, prepare: false });
  const q = (statement) => sql.unsafe(statement);
  const users = [1, 2, 3, 4].map((n) => `10000000-0000-4000-8000-00000000000${n}`);
  const [a, b, c, d] = users;
  const call = async (name, args) => (await q(`SELECT "${schema}".${name}(${args}) AS result`))[0].result;
  const send = (from, to) => call("send_friend_request", `'${from}', '${to}'`);
  const respond = (actor, id, accept) => call("respond_friend_request", `'${actor}', '${id}', ${accept}`);
  const cancel = (actor, id) => call("cancel_friend_request", `'${actor}', '${id}'`);
  const remove = (actor, target) => call("remove_friend", `'${actor}', '${target}'`);
  const count = async (table, condition) => Number((await q(`SELECT count(*) AS count FROM "${schema}".${table} WHERE ${condition}`))[0].count);

  try {
    await q(`CREATE SCHEMA "${schema}"`);
    await q(`
      CREATE TABLE "${schema}".users (id uuid PRIMARY KEY);
      CREATE TABLE "${schema}".user_blocks (blocker_id uuid NOT NULL, blocked_id uuid NOT NULL,
        PRIMARY KEY (blocker_id, blocked_id));
      CREATE TABLE "${schema}".user_privacy_settings (user_id uuid PRIMARY KEY,
        connection_request_scope text NOT NULL DEFAULT 'everyone');
      CREATE TABLE "${schema}".chats (id uuid PRIMARY KEY, type text NOT NULL);
      CREATE TABLE "${schema}".chat_members (chat_id uuid, user_id uuid);
      CREATE TABLE "${schema}".user_contact_pins (user_id uuid, pinned_user_id uuid);
      CREATE TYPE "${schema}".notif_type AS ENUM ('follow');
      CREATE TABLE "${schema}".notifications (user_id uuid, type "${schema}".notif_type,
        actor_id uuid, reference_id uuid);
      INSERT INTO "${schema}".users (id) VALUES ${users.map((id) => `('${id}')`).join(",")};
      INSERT INTO "${schema}".user_privacy_settings (user_id)
        VALUES ${users.map((id) => `('${id}')`).join(",")};
      CREATE FUNCTION "${schema}".users_have_block(uuid, uuid) RETURNS boolean
      LANGUAGE sql STABLE AS $$ SELECT EXISTS (
        SELECT 1 FROM "${schema}".user_blocks
        WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
      ) $$;
    `);
    const source = (await readFile("drizzle/77-friendships.sql", "utf8"))
      .replaceAll("public.", `"${schema}".`)
      .replaceAll("search_path = public", `search_path = "${schema}"`);
    for (const statement of source.split(/--> statement-breakpoint\s*/).map((item) => item.trim()).filter(Boolean)) {
      if (statement.includes("REVOKE ALL")) continue;
      await q(statement);
    }

    await assert.rejects(send(a, a), /FRIEND_SELF/);
    const first = await send(a, b);
    const reciprocal = await send(b, a);
    assert.equal(first.state, "outgoing_pending");
    assert.equal(reciprocal.state, "incoming_pending");
    assert.equal(await count("friend_requests", `status = 'pending'`), 1);
    assert.equal((await send(a, b)).requestId, first.requestId ?? reciprocal.requestId);
    const requestId = first.requestId ?? reciprocal.requestId;
    await assert.rejects(respond(c, requestId, true), /FRIEND_REQUEST_FORBIDDEN/);
    assert.equal((await respond(b, requestId, true)).state, "friends");
    assert.equal((await respond(b, requestId, true)).state, "accepted");
    assert.equal(await count("friendships", `user_low_id = '${a}' AND user_high_id = '${b}'`), 1);
    assert.equal((await send(b, a)).state, "friends");
    assert.equal(await count("notifications", `type = 'friend_accept'`), 1);
    assert.equal((await call("privacy_scope_allows", `'${b}', '${a}', 'contacts'`)), true);
    await remove(b, a);
    await remove(b, a);
    assert.equal(await count("friendships", `user_low_id = '${a}' AND user_high_id = '${b}'`), 0);

    const raced = await Promise.all([send(a, c), send(c, a)]);
    assert.equal(raced[0].requestId, raced[1].requestId);
    assert.equal(await count("friend_requests", `status = 'pending' AND user_low_id = '${a}' AND user_high_id = '${c}'`), 1);

    const declined = await send(c, d);
    assert.equal((await respond(d, declined.requestId, false)).state, "declined");
    assert.equal((await respond(d, declined.requestId, false)).state, "declined");
    const cancelled = await send(c, d);
    await assert.rejects(cancel(d, cancelled.requestId), /FRIEND_REQUEST_FORBIDDEN/);
    assert.equal((await cancel(c, cancelled.requestId)).state, "cancelled");
    assert.equal((await cancel(c, cancelled.requestId)).state, "cancelled");

    await q(`UPDATE "${schema}".user_privacy_settings SET connection_request_scope = 'nobody' WHERE user_id = '${d}'`);
    await assert.rejects(send(a, d), /FRIEND_PRIVACY_DENIED/);
    await q(`UPDATE "${schema}".user_privacy_settings SET connection_request_scope = 'everyone' WHERE user_id = '${d}'`);
    const pending = await send(a, d);
    await q(`INSERT INTO "${schema}".user_blocks VALUES ('${d}', '${a}')`);
    assert.equal(await count("friend_requests", `id = '${pending.requestId}' AND status = 'cancelled'`), 1);
    await assert.rejects(send(a, d), /FRIEND_PAIR_BLOCKED/);
    await q(`DELETE FROM "${schema}".user_blocks WHERE blocker_id = '${d}' AND blocked_id = '${a}'`);
    assert.equal(await count("friendships", `user_low_id = '${a}' AND user_high_id = '${d}'`), 0);
    const fresh = await send(a, d);
    await respond(d, fresh.requestId, true);
    await q(`INSERT INTO "${schema}".user_blocks VALUES ('${a}', '${d}')`);
    assert.equal(await count("friendships", `user_low_id = '${a}' AND user_high_id = '${d}'`), 0);
  } finally {
    await q(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await sql.end({ timeout: 5 });
  }
});
