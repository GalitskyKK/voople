import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("user blocks are directional, private and clean up pending relationships", () => {
  const migration = read("drizzle/64-user-blocks.sql");
  const manifest = read("scripts/migration-manifest.mjs");

  assert.match(migration, /PRIMARY KEY \(blocker_id, blocked_id\)/);
  assert.match(migration, /CHECK \(blocker_id <> blocked_id\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.user_blocks FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /DELETE FROM public\.follows[\s\S]+DELETE FROM public\.user_contact_pins/);
  assert.match(migration, /UPDATE public\.chat_room_invites[\s\S]+status = 'cancelled'/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(manifest, /"64-user-blocks\.sql"/);
});

test("database triggers reject blocked direct interaction and Room invitations", () => {
  const migration = read("drizzle/64-user-blocks.sql");

  assert.match(migration, /follows_reject_blocked_users/);
  assert.match(migration, /contact_pins_reject_blocked_users/);
  assert.match(migration, /room_invites_reject_blocked_users/);
  assert.match(migration, /messages_reject_blocked_direct_users/);
  assert.match(migration, /direct_pairs_reject_blocked_users/);
  assert.match(migration, /direct_room_participants_reject_blocked_users/);
  assert.match(migration, /public\.users_have_block/);
  assert.match(migration, /RAISE EXCEPTION 'USER_INTERACTION_BLOCKED'/);
});

test("server paths enforce blocks before direct contact and Room invite actions", () => {
  const directPrivacy = read("src/server/data/chat-direct-privacy-rest.ts");
  const messages = read("src/server/data/chat-rest.ts");
  const rooms = read("src/server/data/chat-rooms-rest.ts");
  const media = read("src/server/data/chat-room-media-rest.ts");
  const calls = read("src/server/data/chat-calls-rest.ts");
  const invites = read("src/server/data/core-room-invitations-rest.ts");
  const inviteService = read("src/server/services/core-room-invitations.service.ts");

  assert.match(directPrivacy, /assertCanOpenDirectChatRest[\s\S]+assertUsersCanInteractRest/);
  assert.match(messages, /membership\.type === "direct"[\s\S]+assertCanUseDirectChatRest/);
  assert.match(rooms, /enterChatRoomRest[\s\S]+membership\.type === "direct"[\s\S]+assertCanUseDirectChatRest/);
  assert.match(media, /createChatRoomMediaTokenRest[\s\S]+membership\.type === "direct"[\s\S]+assertCanUseDirectChatRest/);
  assert.match(calls, /visibleCallerIds = await filterUnblockedUserIdsRest/);
  assert.match(inviteService, /sendCoreRoomInvite[\s\S]+assertUsersCanInteractRest/);
  assert.match(invites, /respondToCoreRoomInviteRest[\s\S]+assertUsersCanInteractRest/);
  assert.match(invites, /visibleInviterIds[\s\S]+canInteractWithInviter/);
  const blocks = read("src/server/data/user-blocks-rest.ts");
  assert.match(blocks, /otherIds = uniqueIds\.filter/);
  assert.match(blocks, /if \(!otherIds\.length\) return uniqueIds/);
});

test("profile block action is shared, confirmed and has pending and error states", () => {
  const actions = read("src/components/profile/ProfileRelationshipActions.tsx");
  const card = read("src/components/profile/ProfileCard.tsx");
  const sticky = read("src/components/profile/StickyProfileHeader.tsx");
  const desktop = read("desktop/src/adapters/DesktopProfileAdapter.tsx");

  assert.match(actions, /social\.blockState\.useQuery/);
  assert.match(actions, /social\.setUserBlock\.useMutation/);
  assert.match(actions, /window\.confirm/);
  assert.match(actions, /disabled=\{pending\}/);
  assert.match(actions, /role="alert"/);
  assert.match(actions, /Действия с пользователем/);
  assert.match(actions, /h-11 w-11[\s\S]+sm:h-8 sm:w-8/);
  assert.match(card, /ProfileRelationshipActions/);
  assert.match(sticky, /ProfileRelationshipActions/);
  assert.match(desktop, /ProfileRelationshipActions[\s\S]+onNavigate=\{navigate\}/);
});
