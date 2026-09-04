import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core Room invitations are session-bound, private and idempotent", async () => {
  const [migration, data, service, router] = await Promise.all([
    readFile(new URL("../drizzle/58-room-invitations.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/core-room-invitations-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/core-room-invitations.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
  ]);

  assert.match(migration, /UNIQUE \(chat_id, room_session_id, invitee_id\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.chat_room_invites FROM anon, authenticated/);
  assert.match(data, /eq\("session_id", sessionId\)[\s\S]+eq\("user_id", actorId\)[\s\S]+is\("left_at", null\)/);
  assert.match(data, /onConflict: "chat_id,room_session_id,invitee_id"/);
  assert.match(data, /INVITE_TTL_MS = 15 \* 60_000/);
  assert.match(data, /Сначала войдите в приглашённую комнату/);
  assert.match(data, /eq\("status", "pending"\)\s+\.select\("status"\)\s+\.maybeSingle\(\)/);
  assert.match(data, /latestStatus === input\.response/);
  assert.match(data, /listCoreRoomInvitesForSenderRest/);
  assert.match(data, /cancelCoreRoomInviteRest[\s\S]+eq\("inviter_id", input\.inviterId\)[\s\S]+eq\("status", "pending"\)/);
  assert.match(data, /Preserve the notification while emitting its realtime UPDATE/);
  assert.match(service, /requireRootGroupMember\(context\.groupId, input\.inviteeId\)/);
  assert.match(service, /cancelCoreRoomInvite[\s\S]+requireRootGroupMember\(groupId, input\.inviterId\)/);
  assert.match(service, /listCoreRoomInvitePreviews[\s\S]+requireRootGroupMember\(groupId, userId\)/);
  assert.match(service, /filterUserIdsByPrivacyFieldRest[\s\S]+"inviteScope"/);
  assert.match(router, /rateLimits\.inviteToChatRoom/);
  assert.match(router, /name: "room_invite_sent"/);
  assert.doesNotMatch(router, /properties: \{[^}]*inviteeId/);
});

test("Room invite sender and notification action share the core join lifecycle", async () => {
  const [sheet, panel, notifications, notificationUi, action, notificationService, preview, route, desktop] = await Promise.all([
    readFile(new URL("../src/components/chat/voice/VoiceRoomSheet.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/CoreRoomInvitePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/notifications/NotificationsView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/notifications/notification-ui.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/notifications/RoomInviteNotificationActions.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/notifications.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/CoreRoomInvitePreviewView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(main)/room-invites/[inviteId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/shell/DesktopShell.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(sheet, /secondaryPanel === "invite"/);
  assert.match(sheet, /CoreRoomInvitePanel/);
  assert.match(panel, /coreRoomInviteCandidates\.useQuery/);
  assert.match(panel, /coreSendRoomInvite\.useMutation/);
  assert.match(panel, /coreCancelRoomInvite\.useMutation/);
  assert.match(panel, /STATUS_LABELS\[inviteRecord\.status\]/);
  assert.match(panel, /Приглашение действует 15 минут/);
  assert.match(notifications, /RoomInviteNotificationActions/);
  assert.match(notificationUi, /`\/room-invites\/\$\{notification\.roomInvite\.id\}`/);
  assert.match(action, /useGroupNowRoomJoin/);
  assert.match(action, /voice\.openCoreRoom/);
  assert.match(action, /response: "accepted"/);
  assert.match(action, /response: "declined"/);
  assert.match(notificationService, /listCoreRoomInvitePreviews/);
  assert.match(preview, /coreRoomInvitePreview\.useQuery/);
  assert.match(preview, /RoomInviteNotificationActions/);
  assert.match(preview, /Приглашение недоступно/);
  assert.match(route, /CoreRoomInvitePreviewView/);
  assert.match(route, /robots: \{ index: false, follow: false \}/);
  assert.match(desktop, /roomInviteIdFromPath/);
  assert.match(desktop, /<DesktopRoomInvitePreview inviteId=\{roomInviteId\}/);
  assert.match(action, /key=\{invite \? `\$\{invite\.id\}:\$\{invite\.expiresAt\}`/);
  assert.match(action, /invite\?\.status === "pending"[\s\S]*respond\.data\?\.status \?\? invite\.status/);
  assert.doesNotMatch(action, /setLocalStatus|useEffect/);
});
