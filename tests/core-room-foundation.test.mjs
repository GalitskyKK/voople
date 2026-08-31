import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../drizzle/59-core-room-foundation.sql", import.meta.url);
const schemaPath = new URL("../src/server/db/chat-room-schema.ts", import.meta.url);
const manifestPath = new URL("../scripts/migration-manifest.mjs", import.meta.url);

test("core Room migration is additive and release tracked", async () => {
  const [migration, schema, manifest] = await Promise.all([
    readFile(migrationPath, "utf8"),
    readFile(schemaPath, "utf8"),
    readFile(manifestPath, "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.group_rooms/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.live_sessions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.live_session_participants/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.message_room_contexts/);
  assert.match(migration, /WHERE kind = 'lobby' AND archived_at IS NULL/);
  assert.match(migration, /WHERE left_at IS NULL/);
  assert.match(migration, /room_name_snapshot varchar\(80\) NOT NULL/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(migration, /REVOKE ALL ON TABLE public\.live_sessions FROM anon, authenticated/);

  assert.match(schema, /export const chatRooms = pgTable/);
  assert.match(schema, /export const groupRooms = pgTable/);
  assert.match(schema, /export const liveSessions = pgTable/);
  assert.match(schema, /export const messageRoomContexts = pgTable/);
  assert.ok(manifest.match(/59-core-room-foundation\.sql/g)?.length === 2);
});

test("message history keeps immutable Room context snapshots", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /roomNameSnapshot: varchar/);
  assert.match(schema, /roomKindSnapshot: varchar/);
  assert.match(schema, /roomId: uuid\("room_id"\).*onDelete: "set null"/);
  assert.match(schema, /liveSessionId: uuid\("live_session_id"\).*onDelete: "set null"/);
});
