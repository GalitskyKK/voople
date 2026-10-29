import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { roomCoverDraftSchema, defaultRoomCover } from "../src/lib/chat/room-cover.ts";
import { assertOwnedUploadKey } from "../src/lib/object-storage/paths.ts";
import { UPLOAD_LIMITS } from "../src/lib/object-storage/config.ts";
import { REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER } from "../scripts/migration-manifest.mjs";

test("room cover inputs accept only recognized presets or owned upload keys", () => {
  for (const preset of ["orbit", "arcade", "wave", "dusk"]) assert.equal(roomCoverDraftSchema.parse({ kind: "preset", preset }).preset, preset);
  for (const input of [{ kind: "preset", preset: "unknown" }, { kind: "upload", url: "https://example.com/image" }, { kind: "upload", mediaKey: "" }]) {
    assert.equal(roomCoverDraftSchema.safeParse(input).success, false);
  }
  assertOwnedUploadKey("uploads/room-cover/alice/image.png", "alice", "room-cover");
  for (const key of ["uploads/room-cover/bob/image.png", "uploads/avatar/alice/image.png", "uploads/room-cover/alice/../bob/image.png"]) {
    assert.throws(() => assertOwnedUploadKey(key, "alice", "room-cover"));
  }
  assert.equal(UPLOAD_LIMITS["room-cover"].maxBytes, 5 * 1024 * 1024);
  assert.deepEqual(defaultRoomCover("stable-room"), defaultRoomCover("stable-room"));
});

test("cover creation is additive, atomic and inaccessible to browser roles", () => {
  const migration = readFileSync(new URL("../drizzle/94-room-covers.sql", import.meta.url), "utf8");
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public.group_room_covers FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /v_result := public.create_and_join_group_room\(/);
  const creation = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.create_and_join_group_room_with_cover"));
  assert.ok(creation.indexOf("v_result :=") < creation.indexOf("INSERT INTO public.group_room_covers"));
  assert.match(migration, /v_creator = p_user_id\) FOR SHARE/);
  assert.match(migration, /ON CONFLICT \(room_id\) DO NOTHING/);
  for (const manifest of [REQUIRED_MIGRATIONS, RELEASE_APPLY_ORDER]) assert.equal(manifest.at(-1), "94-room-covers.sql");
});
