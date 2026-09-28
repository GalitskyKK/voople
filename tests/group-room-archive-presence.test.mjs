import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Room archive follows fresh member and guest presence, never archives Lobby", async () => {
  const [migration, manifest, menu] = await Promise.all([
    readFile(new URL("../drizzle/74-group-room-archive-presence.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceRoomActionsMenu.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /FUNCTION public\.archive_group_room/);
  assert.match(migration, /v_room\.kind = 'lobby'/);
  assert.match(migration, /v_room\.kind = 'temporary' AND v_room\.created_by = p_user_id/);
  assert.match(migration, /participant\.left_at IS NULL/);
  assert.match(migration, /participant\.last_seen_at > v_now - interval '120 seconds'/);
  assert.match(migration, /guest\.left_at IS NULL/);
  assert.match(migration, /guest\.access_expires_at > v_now/);
  assert.match(migration, /guest\.last_seen_at > v_now - interval '60 seconds'/);
  assert.match(migration, /ROOM_NOT_EMPTY/);
  assert.match(migration, /FOR UPDATE;/);
  assert.equal(manifest.match(/74-group-room-archive-presence\.sql/g)?.length, 2);
  assert.match(menu, /room\.canPin \|\| room\.kind === "temporary"/);
});
