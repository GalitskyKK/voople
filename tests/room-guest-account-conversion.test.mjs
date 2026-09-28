import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Room guest conversion keeps Group access behind explicit policy", async () => {
  const [migration, manifest] = await Promise.all([
    readFile(new URL("../drizzle/63-room-guest-account-conversion.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.convert_room_guest_account/);
  assert.match(migration, /access_token_hash = p_access_token_hash/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /v_creator_role IN \('owner', 'admin'\)/);
  assert.match(migration, /v_group\.group_visibility IN \('public', 'unlisted'\)/);
  assert.match(migration, /v_group\.join_policy = 'open'/);
  assert.match(migration, /v_group\.join_policy = 'request'/);
  assert.match(migration, /INSERT INTO public\.group_join_requests/);
  assert.match(migration, /converted_user_id = p_user_id/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.convert_room_guest_account/);
  assert.doesNotMatch(migration, /WHERE\s+token_hash = p_access_token_hash/);
  assert.equal(manifest.match(/63-room-guest-account-conversion\.sql/g)?.length, 2);
});

test("conversion endpoint requires both the guest credential and authenticated account", async () => {
  const [route, data, service] = await Promise.all([
    readFile(new URL("../src/app/api/room-guests/conversion/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/room-guests-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/room-guests.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /roomGuestAccessToken\(request\)/);
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /convertRoomGuestAccount\(\{ accessToken, userId: user\.id \}\)/);
  assert.match(route, /response\.cookies\.set\(ROOM_GUEST_COOKIE, ""/);
  assert.match(route, /room_guest_converted/);
  assert.match(data, /rpc\("convert_room_guest_account"/);
  assert.match(data, /p_access_token_hash: tokenHash\(input\.accessToken\)/);
  assert.match(service, /userId: z\.string\(\)\.uuid\(\)\.parse\(input\.userId\)/);
});

test("guest conversion is an explicit resumable auth continuation", async () => {
  const [page, hook, session, route] = await Promise.all([
    readFile(new URL("../src/components/chat/RoomGuestPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useRoomGuestConversion.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useRoomGuestSession.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/room-guest/[token]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Сохранить участие/);
  assert.match(hook, /authEntryHref\("\/register", returnPath\)/);
  assert.match(hook, /authEntryHref\("\/login", returnPath\)/);
  assert.match(hook, /credentials: "same-origin"/);
  assert.match(session, /prepareAccountConversion/);
  assert.match(session, /await media\.disconnect\(\)/);
  assert.doesNotMatch(session, /pagehide|keepalive: true/);
  assert.match(route, /conversionRequested=\{query\.convert === "1"\}/);
});
