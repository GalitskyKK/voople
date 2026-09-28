import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Room rename is locked, authorized and service-role only", async () => {
  const migration = await readFile(
    new URL("../drizzle/70-group-room-rename.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /FUNCTION public\.rename_group_room/);
  assert.match(migration, /length\(btrim\(p_name\)\) NOT BETWEEN 1 AND 80/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(p_room_id::text, 912\)\)/);
  assert.match(migration, /v_room\.kind = 'lobby'/);
  assert.match(migration, /v_room\.created_by <> p_user_id/);
  assert.match(migration, /v_role NOT IN \('owner', 'admin'\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.rename_group_room/);
  assert.match(migration, /FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /TO service_role/);
});

test("Room rename is validated by the server and edited inline in Full Room", async () => {
  const [data, service, groupNow, router, adapter, control, title, manifest] = await Promise.all([
    readFile(new URL("../src/server/data/group-room-mutations-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-room-mutations.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-now.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceRoomServerAdapter.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useChatRoomControl.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceRoomTitle.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(data, /roomRpc\("rename_group_room"/);
  assert.match(service, /export async function renameGroupRoom/);
  assert.match(service, /const ownsRoom = room\.createdBy === input\.userId/);
  assert.match(groupNow, /room\.createdBy === viewerId/);
  assert.match(router, /coreRenameRoom/);
  assert.match(router, /name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(80\)/);
  assert.match(router, /rateLimits\.manageGroupChat/);
  assert.match(adapter, /coreRename\.mutateAsync/);
  assert.match(adapter, /coreGroupNow\.invalidate/);
  assert.match(control, /currentCoreRoom\?\.canManage === true/);
  assert.match(title, /Переименовать комнату/);
  assert.match(title, /event\.key !== "Escape"/);
  assert.match(title, /maxLength=\{80\}/);
  assert.equal((manifest.match(/70-group-room-rename\.sql/g) ?? []).length, 2);
});
