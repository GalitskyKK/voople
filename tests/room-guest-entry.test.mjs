import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isRoomGuestInviteToken,
  roomGuestInviteUrl,
} from "../src/lib/chat/room-guest-invite-url.ts";
import {
  RoomGuestResponseError,
  guestSessionMatchesInvite,
  roomGuestMicrophoneError,
  roomGuestResponseJson,
  roomGuestUnavailableReasonFromError,
} from "../src/lib/chat/room-guest-client.ts";

const token = "a".repeat(43);

test("Room guest links accept only opaque 256-bit base64url tokens and trusted origins", () => {
  assert.equal(isRoomGuestInviteToken(token), true);
  assert.equal(isRoomGuestInviteToken("short"), false);
  assert.equal(roomGuestInviteUrl(token, "https://voople.app"), `https://voople.app/room-guest/${token}`);
  assert.equal(roomGuestInviteUrl(token, "http://localhost:3000"), `http://localhost:3000/room-guest/${token}`);
  for (const origin of ["http://voople.app", "https://user:pass@voople.app", "https://voople.app/path"]) {
    assert.equal(roomGuestInviteUrl(token, origin), null);
  }
});

test("guest microphone failures expose a useful recovery reason", () => {
  assert.match(roomGuestMicrophoneError({ name: "NotAllowedError" }), /настройках браузера/);
  assert.match(roomGuestMicrophoneError({ name: "NotFoundError" }), /Микрофон не найден/);
  assert.equal(roomGuestMicrophoneError(new Error("device busy")), "device busy");
});

test("an existing guest cookie cannot restore a different Room link", async () => {
  assert.equal(guestSessionMatchesInvite("room-session-a", "room-session-a"), true);
  assert.equal(guestSessionMatchesInvite("room-session-b", "room-session-a"), false);
  assert.equal(guestSessionMatchesInvite(null, "room-session-a"), false);

  const [hook, route, data] = await Promise.all([
    readFile(new URL("../src/hooks/useRoomGuestSession.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/room-guest/[token]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/room-guests-rest.ts", import.meta.url), "utf8"),
  ]);
  assert.match(hook, /guestSessionMatchesInvite\(expectedSessionId, snapshot\.guest\.sessionId\)/);
  assert.match(hook, /connectSession\(preview\.participantCount, true, preview\.sessionId\)/);
  assert.match(route, /<RoomGuestPage key=\{token\}/);
  assert.match(data, /sessionId: String\(session\.id\)/);
  assert.match(data, /\.gt\("last_seen_at", new Date\(Date\.now\(\) - 120_000\)/);
});

test("guest join failures keep a machine-readable unavailable reason", async () => {
  const error = await roomGuestResponseJson(new Response(
    JSON.stringify({ error: "В комнате больше нет гостевых мест", reason: "full" }),
    { status: 409, headers: { "Content-Type": "application/json" } },
  )).catch((caught) => caught);

  assert.ok(error instanceof RoomGuestResponseError);
  assert.equal(error.status, 409);
  assert.equal(roomGuestUnavailableReasonFromError(error), "full");
});

test("guest persistence is Room-only, hash-only and inaccessible to public database roles", async () => {
  const [migration, manifest] = await Promise.all([
    readFile(new URL("../drizzle/62-room-guest-entry.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/migration-manifest.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.room_guest_invites/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.live_session_guests/);
  assert.match(migration, /token_hash char\(64\) NOT NULL UNIQUE/);
  assert.match(migration, /access_token_hash char\(64\) NOT NULL UNIQUE/);
  assert.match(migration, /join_request_id uuid NOT NULL UNIQUE/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.room_guest_invites FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.live_session_guests FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.join_room_as_guest/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /ROOM_GUEST_CAPACITY_REACHED/);
  assert.match(migration, /ROOM_GUEST_IDEMPOTENCY_CONFLICT/);
  assert.match(migration, /last_seen_at > v_now - interval '60 seconds'/);
  assert.match(migration, /converted_user_id uuid REFERENCES public\.users/);
  assert.doesNotMatch(migration, /INSERT INTO public\.chat_members/);
  assert.equal(manifest.match(/62-room-guest-entry\.sql/g)?.length, 2);
});

test("guest transport keeps credentials out of browser JavaScript and restricts media grants", async () => {
  const [data, service, inviteRoute, sessionRoute, media, router] = await Promise.all([
    readFile(new URL("../src/server/data/room-guests-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/room-guests.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/room-guests/invites/[token]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/room-guests/session/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/chat-room-media-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(data, /createHash\("sha256"\)/);
  assert.match(data, /createHmac\("sha256", secret\)/);
  assert.match(data, /p_request_id: input\.requestId/);
  assert.doesNotMatch(data, /\.insert\([\s\S]*?accessToken/);
  assert.match(service, /normalizeGuestName/);
  assert.match(inviteRoute, /response\.cookies\.set\(ROOM_GUEST_COOKIE, result\.accessToken/);
  assert.match(inviteRoute, /requestId: z\.string\(\)\.uuid\(\)/);
  assert.match(inviteRoute, /roomGuestUnavailableReason\(error\)/);
  assert.match(inviteRoute, /\{ error: message, reason \}/);
  assert.match(data, /class RoomGuestUnavailableError extends Error/);
  assert.match(service, /error instanceof RoomGuestUnavailableError/);
  assert.match(data, /\.select\("id, invite_id, live_session_id, display_name, access_expires_at/);
  assert.match(data, /invite\.live_session_id !== data\.live_session_id/);
  assert.match(data, /if \(invite\.revoked_at\)/);
  assert.match(data, /new Date\(invite\.expires_at\)\.getTime\(\) <= Date\.now\(\)/);
  assert.match(data, /heartbeatRoomGuestRest[\s\S]*?await resolveRoomGuestRest\(accessToken\)/);
  assert.doesNotMatch(inviteRoute, /accessToken: result\.accessToken/);
  assert.match(sessionRoute, /Cache-Control": "private, no-store"/);
  assert.match(sessionRoute, /roomGuestCookieOptions/);
  assert.match(sessionRoute, /resumeRoomGuestSession/);
  assert.match(sessionRoute, /roomGuestUnavailableReason\(error\) !== null/);
  assert.match(sessionRoute, /status: ended \? 410 : 503/);
  assert.match(media, /const identity = `guest:\$\{input\.guestId\}`/);
  assert.match(media, /canPublishData: false/);
  assert.match(media, /canPublishSources: \[TrackSource\.MICROPHONE\]/);
  assert.match(router, /coreCreateRoomGuestInvite: protectedProcedure/);
  assert.match(router, /rateLimits\.inviteToChatRoom/);
});

test("guest UI joins muted, exposes recovery states and keeps guests out of profiles", async () => {
  const [page, unavailable, hook, media, snapshot, groupNow, participant] = await Promise.all([
    readFile(new URL("../src/components/chat/RoomGuestPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/RoomGuestUnavailableState.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useRoomGuestSession.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useRoomGuestMedia.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/group-now-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-now.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowParticipant.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Зайти гостем/);
  assert.match(page, /Микрофон при входе выключен/);
  assert.match(page, /Подключить снова/);
  assert.match(page, /Нет подключения к интернету/);
  assert.match(page, /guest\.micError/);
  assert.match(page, /screenRootRef/);
  assert.match(page, /roomGuestUnavailableReasonFromError\(error\)/);
  assert.match(unavailable, /Сейчас нет свободного места/);
  assert.match(unavailable, /Проверить снова/);
  assert.match(media, /useState\(true\)/);
  assert.match(media, /RoomEvent\.Reconnecting/);
  assert.match(media, /activeScreenPublicationRef/);
  assert.match(media, /screenPublicationBelongsToFocus/);
  assert.match(media, /publication\.setSubscribed\(false\)/);
  assert.match(hook, /setInterval\(heartbeat, 20_000\)/);
  assert.match(hook, /response\.status !== 401 && response\.status !== 410/);
  assert.match(hook, /await disconnectMedia\(\)/);
  assert.match(hook, /await loadPreview\(\)/);
  assert.match(hook, /crypto\.randomUUID\(\)/);
  assert.match(hook, /connectSession\(preview\.participantCount, true, preview\.sessionId\)/);
  assert.doesNotMatch(hook, /pagehide|keepalive: true/);
  assert.match(snapshot, /from\("live_session_guests"\)/);
  assert.match(snapshot, /last_seen_at/);
  assert.match(groupNow, /id: `guest:\$\{guest\.guestId\}`/);
  assert.match(participant, /!onOpenProfile \|\| user\.guest/);
});

test("guest credentials cannot become Group credentials or cross the invited LiveSession", async () => {
  const [trpc, router, data, guestRoute, sessionRoute] = await Promise.all([
    readFile(new URL("../src/server/trpc/init.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/room-guests-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/room-guests/invites/[token]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/room-guests/session/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(trpc, /protectedProcedure = t\.procedure\.use[\s\S]*?getVerifiedUser\(\)[\s\S]*?UNAUTHORIZED/);
  assert.match(router, /coreGroupNow: protectedProcedure/);
  assert.match(router, /coreRoomInviteCandidates: protectedProcedure/);
  assert.match(data, /\.eq\("token_hash", tokenHash\(token\)\)/);
  assert.match(data, /\.eq\("id", invite\.live_session_id\)/);
  assert.match(data, /invite\.live_session_id !== data\.live_session_id/);
  assert.match(guestRoute, /roomGuestCookieOptions\(\)/);
  assert.doesNotMatch(guestRoute, /chat_members|supabase\.auth\.signIn/);
  assert.match(sessionRoute, /roomGuestUnavailableReason\(error\) !== null/);
});
