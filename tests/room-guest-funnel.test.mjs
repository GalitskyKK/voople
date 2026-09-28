import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("guest funnel events are privacy-safe and idempotent", async () => {
  const [migration, manifest, telemetry, data, analytics] = await Promise.all([
    read("drizzle/68-guest-funnel-analytics.sql"),
    read("scripts/migration-manifest.mjs"),
    read("src/server/services/client-telemetry.service.ts"),
    read("src/server/data/product-analytics-rest.ts"),
    read("src/server/services/room-guest-analytics.service.ts"),
  ]);

  assert.match(migration, /ADD COLUMN IF NOT EXISTS dedupe_key varchar\(64\)/);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS client_telemetry_server_event_dedupe_idx/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.heartbeat_room_guest_v2/);
  assert.doesNotMatch(migration, /invite_token\s+varchar|access_token\s+varchar|media_id/i);
  assert.equal(manifest.match(/68-guest-funnel-analytics\.sql/g)?.length, 2);
  assert.match(telemetry, /actorKey\(`product:\$\{input\.name\}:\$\{input\.dedupeId\}`\)/);
  assert.match(data, /onConflict: "event_name,dedupe_key"/);
  assert.match(data, /ignoreDuplicates: true/);
  assert.match(analytics, /room_guest_preview_opened/);
  assert.match(analytics, /dedupeId: `\$\{inviteToken\}:\$\{audience\.actorId\}`/);
  assert.match(analytics, /state: "new"/);
  assert.match(analytics, /roomGuestInviteAudienceRest/);
  assert.doesNotMatch(analytics, /properties: \{[^}]*inviteToken|properties: \{[^}]*guestId/);
});

test("guest funnel records real media and useful participation milestones", async () => {
  const [migration, sessionRoute, guestData, hook, inviteRoute, router] = await Promise.all([
    read("drizzle/68-guest-funnel-analytics.sql"),
    read("src/app/api/room-guests/session/route.ts"),
    read("src/server/data/room-guests-rest.ts"),
    read("src/hooks/useRoomGuestSession.ts"),
    read("src/app/api/room-guests/invites/[token]/route.ts"),
    read("src/server/trpc/routers/chat-core-rework.ts"),
  ]);

  assert.match(migration, /v_guest\.joined_at <= v_now - interval '3 minutes'/);
  assert.match(migration, /peer\.last_seen_at > v_now - interval '60 seconds'/);
  assert.match(migration, /participant\.left_at IS NULL/);
  assert.match(guestData, /rpc\("heartbeat_room_guest_v2"/);
  assert.match(sessionRoute, /z\.literal\("media_connected"\)/);
  assert.match(sessionRoute, /room_guest_media_connected/);
  assert.match(sessionRoute, /room_guest_useful_participation/);
  assert.match(sessionRoute, /durationSeconds: 180/);
  assert.match(hook, /mediaConnected && snapshot\.media\.enabled/);
  assert.match(hook, /updateMediaPresence\("media_connected"\)/);
  assert.match(inviteRoute, /recordRoomGuestPreview/);
  assert.match(inviteRoute, /recordRoomGuestJoined\(request, token, result\.guestId\)/);
  assert.match(router, /route: "\/trpc\/chat\.coreCreateRoomGuestInvite"/);
  assert.match(router, /transport: "guest_link"/);
});
