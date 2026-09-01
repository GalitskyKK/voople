import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../drizzle/61-core-room-create-and-join.sql",
  import.meta.url,
);

test("create and join is atomic, idempotent and service-role only", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS creation_request_id uuid/);
  assert.match(migration, /group_rooms_creation_request_unique/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_request_id::text, 913\)\)/);
  assert.match(migration, /public\.create_group_room\(/);
  assert.match(migration, /public\.join_group_room\(/);
  assert.match(migration, /ROOM_IDEMPOTENCY_CONFLICT/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_and_join_group_room/);
  assert.match(migration, /TO service_role/);
});

test("server validates and rate-limits the atomic create-and-join RPC", async () => {
  const [data, service, router, manifest] = await Promise.all([
    readFile(new URL("../src/server/data/group-room-mutations-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-room-mutations.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(data, /roomRpc\("create_and_join_group_room"/);
  assert.match(data, /createAndJoinSchema/);
  assert.match(service, /requireRootGroup/);
  assert.match(service, /requireRoomAdmin/);
  assert.match(router, /coreCreateAndJoinRoom/);
  assert.match(router, /requestId: z\.string\(\)\.uuid\(\)/);
  assert.match(router, /confirmedCrossContext: z\.boolean\(\)\.default\(false\)/);
  assert.match(router, /rateLimits\.manageGroupChat/);
  assert.match(router, /rateLimits\.enterChatRoom/);
  assert.equal(manifest.match(/61-core-room-create-and-join\.sql/g)?.length, 2);
});
