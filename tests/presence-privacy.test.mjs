import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("online presence is filtered by the server instead of a global client channel", () => {
  const web = read("src/providers/OnlinePresenceProvider.tsx");
  const desktop = read("desktop/src/providers/DesktopPresenceProvider.tsx");
  assert.doesNotMatch(web, /presence:global/);
  assert.doesNotMatch(desktop, /presence:global/);
  assert.match(web, /social\.visiblePresence/);
  assert.match(desktop, /social\.visiblePresence/);
});

test("web and desktop compose the same privacy settings view", () => {
  const web = read("src/components/settings/WebInterestSettings.tsx");
  const desktop = read("desktop/src/settings/DesktopInterestSettings.tsx");
  assert.match(web, /UserPrivacySettingsPanel/);
  assert.match(desktop, /UserPrivacySettingsPanel/);
});

test("privacy migration contains every product scope and server filter", () => {
  const migration = read("drizzle/54-presence-privacy.sql");
  for (const scope of ["everyone", "contacts_and_groups", "contacts", "nobody"]) {
    assert.match(migration, new RegExp(`'${scope}'`));
  }
  assert.match(migration, /list_visible_online_user_ids/);
  assert.match(migration, /show_interests/);
});

test("home room activity enforces roomsScope before exposing participants", () => {
  const homeData = read("src/server/data/home-overview-rest.ts");
  const scopeCheck = homeData.indexOf('"roomsScope"');
  const participantMapping = homeData.indexOf("for (const row of data ?? [])");
  assert.ok(scopeCheck > 0);
  assert.ok(participantMapping > scopeCheck);
  assert.match(homeData, /roomVisibility\.has\(String\(row\.user_id\)\)/);
  assert.match(homeData, /filterUserIdsByPrivacyFieldRest/);
});

test("all private activity fields use the shared server-side scope policy", () => {
  const privacy = read("src/server/data/privacy-rest.ts");
  for (const field of [
    "onlineScope",
    "gamingScope",
    "musicScope",
    "roomsScope",
    "inviteScope",
    "connectionRequestScope",
  ]) {
    assert.match(privacy, new RegExp(`\\| "${field}"`));
  }
  assert.match(privacy, /filterUserIdsByPrivacyFieldRest/);
  assert.match(privacy, /filterRecommendationEligibleUserIdsRest/);
});

test("new direct chats enforce request privacy both before and inside the atomic RPC", () => {
  const chat = read("src/server/data/chat-direct-privacy-rest.ts");
  const migration = read("drizzle/57-direct-chat-privacy-enforcement.sql");
  assert.match(chat, /privacy\.connectionRequestScope/);
  assert.match(chat, /if \(existingPair\) return/);
  assert.match(migration, /IF v_chat_id IS NOT NULL THEN\s+RETURN v_chat_id/s);
  assert.match(migration, /privacy_scope_allows\(\s+p_other_user,\s+p_current_user/s);
  assert.match(migration, /Connection requests are restricted/);
  const readiness = read("scripts/check-migration-readiness.mjs");
  assert.match(readiness, /pg_get_functiondef/);
  assert.match(readiness, /atomic connection privacy gate/);
});

test("group member pickers and mutations enforce invite privacy", () => {
  const management = read("src/server/data/chat-management-rest.ts");
  const checks = management.match(/"inviteScope"/g) ?? [];
  assert.equal(checks.length, 3);
  assert.match(management, /listGroupContactsRest[\s\S]+filterUserIdsByPrivacyFieldRest/);
  assert.match(management, /addGroupMembersRest[\s\S]+Один из пользователей запретил приглашения/);
  assert.match(management, /createGroupChatRest[\s\S]+Один из пользователей запретил приглашения/);
});

test("Room invite candidates and mutations enforce invite privacy", () => {
  const invitations = read("src/server/services/core-room-invitations.service.ts");
  assert.match(invitations, /listCoreRoomInviteCandidates[\s\S]+"inviteScope"/);
  assert.match(invitations, /sendCoreRoomInvite[\s\S]+"inviteScope"/);
  assert.match(invitations, /Пользователь запретил приглашения от вас/);
});

test("recommendations and anonymous invite activity cannot bypass privacy", () => {
  const recommendations = read("src/server/data/search-highlights-rest.ts");
  const inviteActivity = read("src/server/data/chat-invite-activity-rest.ts");
  assert.match(recommendations, /filterRecommendationEligibleUserIdsRest/);
  assert.match(recommendations, /eligibleIds\.has/);
  assert.match(inviteActivity, /filterUserIdsByPrivacyFieldRest\(memberIds, null, "onlineScope"\)/);
  assert.match(inviteActivity, /filterUserIdsByPrivacyFieldRest\(memberIds, null, "roomsScope"\)/);
});

test("legacy online toggle updates the canonical privacy settings", () => {
  const users = read("src/server/data/users-rest.ts");
  assert.match(users, /setUserPrivacySettingsRest/);
  assert.match(users, /onlineScope: visible/);
  assert.doesNotMatch(users, /update\(\{ show_online_status: visible/);
});

test("shared privacy settings have explicit loading failure and retry states", () => {
  const panel = read("src/components/social/UserPrivacySettingsPanel.tsx");
  assert.match(panel, /aria-busy="true"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, />Повторить</);
});
