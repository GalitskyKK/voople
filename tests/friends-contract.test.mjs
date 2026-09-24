import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("migration 77 is release-required and maintains a separate friendship lifecycle", () => {
  const migration = read("drizzle/77-friendships.sql");
  const manifest = read("scripts/migration-manifest.mjs");
  assert.equal((manifest.match(/77-friendships\.sql/g) ?? []).length, 2);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.friend_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.friendships/);
  assert.match(migration, /friend_requests_one_pending_pair/);
  assert.match(migration, /PRIMARY KEY \(user_low_id, user_high_id\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /FRIEND_REQUEST_PAIR_IMMUTABLE/);
  assert.match(migration, /privacy_scope_allows\(p_addressee_id, p_requester_id/);
  assert.match(migration, /CREATE TRIGGER user_blocks_friend_cleanup/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.respond_friend_request/);
  assert.match(migration, /ON CONFLICT \(user_low_id, user_high_id\) DO NOTHING/);
  assert.doesNotMatch(migration, /INSERT INTO public\.follows/);
});

test("friend operations are actor-bound and legacy follow API remains", () => {
  const router = read("src/server/trpc/routers/social.ts");
  const data = read("src/server/data/friends-rest.ts");
  const profile = read("src/server/trpc/routers/profile.ts");
  for (const operation of ["sendFriendRequest", "respondFriendRequest", "cancelFriendRequest", "removeFriend"]) {
    assert.match(router, new RegExp(`${operation}: protectedProcedure`));
  }
  assert.match(router, /sendFriendRequest\(ctx\.user\.id, input\.userId\)/);
  assert.match(router, /respondFriendRequest\(ctx\.user\.id, input\.requestId/);
  assert.match(data, /"outgoing_pending" \| "incoming_pending" \| "friends" \| "blocked"/);
  assert.match(profile, /getFollowState:/);
  assert.match(profile, /toggleFollow:/);
  assert.match(profile, /getBetaByUsername:/);
});

test("beta relationship UI and notifications use Friends, not follows", () => {
  const action = read("src/components/profile/ProfileFriendAction.tsx");
  const relationship = read("src/components/profile/ProfileRelationshipActions.tsx");
  const notification = read("src/components/notifications/notification-ui.ts");
  for (const copy of ["Добавить в друзья", "Запрос отправлен", "Принять", "Отклонить", "В друзьях", "Удалить"]) {
    assert.ok(action.includes(copy));
  }
  assert.match(relationship, /ProfileFriendAction/);
  assert.doesNotMatch(relationship, /ProfileFollowButton/);
  assert.match(relationship, /Разблокировать/);
  assert.match(notification, /friend_request/);
  assert.match(notification, /friend_accept/);
  assert.match(notification, /notification\.actor\.username/);
});

test("accepted friendship owns contact selection and common Groups require viewer membership", () => {
  const contacts = read("src/server/data/chat-management-rest.ts");
  const home = read("src/server/data/home-overview-rest.ts");
  const common = read("src/server/data/profile-common-groups-rest.ts");
  assert.match(contacts, /listFriendIdsRest/);
  assert.doesNotMatch(contacts, /getMutualContactIds|from\("follows"\)/);
  assert.match(home, /listFriendIdsRest/);
  assert.doesNotMatch(home, /from\("follows"\)/);
  assert.match(common, /\.eq\("user_id", viewerId\)/);
  assert.match(common, /\.in\("chat_id", ownIds\)/);
  assert.match(common, /filterUnblockedUserIdsRest/);
});
