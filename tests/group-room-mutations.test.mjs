import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../drizzle/60-core-room-mutations.sql", import.meta.url);

test("Room mutations serialize user and room transitions in the database", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.join_group_room/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_user_id::text, 911\)\)/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_room_id::text, 912\)\)/);
  assert.match(migration, /ROOM_CONTEXT_CONFIRMATION_REQUIRED/);
  assert.match(migration, /p_allow_cross_context boolean DEFAULT false/);
  assert.match(migration, /ON CONFLICT \(session_id, user_id\)/);
  assert.match(migration, /status = 'grace'/);
  assert.match(migration, /kind = 'temporary'/);
});

test("stale leave and heartbeat target one concrete LiveSession", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.leave_live_session/);
  assert.match(migration, /p_session_id IS NULL OR participant\.session_id = p_session_id/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.heartbeat_live_session/);
  assert.match(migration, /participant\.session_id = p_session_id/);
  assert.match(migration, /participant\.left_at IS NULL/);
});

test("server owns authorization and old clients respect new active sessions", async () => {
  const [service, data, legacy, manifest] = await Promise.all([
    readFile(new URL("../src/server/services/group-room-mutations.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/group-room-mutations-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/chat-rooms-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(service, /getChatMembershipRest/);
  assert.match(service, /membership\.type !== "group" \|\| membership\.parentChatId/);
  assert.match(service, /requireRoomAdmin/);
  assert.match(data, /z\.object/);
  assert.match(data, /roomRpc\("join_group_room"/);
  assert.match(data, /"expire_group_room_grace"/);
  assert.match(legacy, /\.from\("live_session_participants"\)/);
  assert.ok(manifest.match(/60-core-room-mutations\.sql/g)?.length === 2);
});
