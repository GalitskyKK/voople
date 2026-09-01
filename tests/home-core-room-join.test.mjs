import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Home exposes every active core Room only after membership and privacy gates", async () => {
  const [data, activeService, service, types] = await Promise.all([
    readFile(new URL("../src/server/data/home-core-rooms-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/home-active-rooms.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/home.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/types/home.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /export async function listActiveCoreRoomsRest/);
  assert.match(data, /\.from\("live_sessions"\)/);
  assert.match(data, /\.eq\("kind", "group_room"\)/);
  assert.match(data, /\.from\("live_session_participants"\)/);
  assert.match(data, /\.gte\("last_seen_at", activeAfter\)/);
  assert.match(data, /\.from\("chat_members"\)/);
  assert.match(data, /memberPairs\.has\(`\$\{session\.groupId\}:\$\{userId\}`\)/);
  assert.match(data, /filterUserIdsByPrivacyFieldRest\([\s\S]+"roomsScope"/);
  assert.match(data, /if \(!room \|\| room\.groupId !== session\.groupId \|\| !participants\.length\) return \[\]/);
  assert.match(activeService, /listActiveCoreRoomsRest\(rootGroupIds, userId\)/);
  assert.match(activeService, /getServerFeatureAccess\("multi_room_groups", userId\)\.enabled/);
  assert.match(activeService, /coreRoomsEnabled[\s\S]+\? listActiveCoreRoomsRest/);
  assert.match(activeService, /id: `core-room:\$\{room\.id\}`/);
  assert.match(activeService, /conversationId: groupId/);
  assert.match(service, /listActiveHomeRoomItems\(chats, userId\)/);
  assert.match(service, /activeConversationIds/);
  assert.match(service, /continueWithoutActiveRooms/);
  assert.match(types, /export type HomeRoomTarget/);
  assert.match(types, /roomTarget\?: HomeRoomTarget/);
});

test("Home Room CTA performs the shared session-bound join on web and desktop", async () => {
  const [controller, view, item, web, desktop, joinHook, voiceProvider] = await Promise.all([
    readFile(new URL("../src/components/home/HomeNowConnectedPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeOverviewPanelsView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeNowItem.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeOverviewPanels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopFeedAdapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useGroupNowRoomJoin.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceSessionProvider.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(controller, /useGroupNowRoomJoin/);
  assert.match(controller, /voice\.openCoreRoom/);
  assert.match(controller, /voice\.joinRoom/);
  assert.match(controller, /presence_room_joined/);
  assert.equal(controller.match(/presence_room_joined/g)?.length, 1);
  assert.match(controller, /GroupNowRoomSwitchDialog/);
  assert.match(view, /HomeNowItemView/);
  assert.match(item, /if \(item\.roomTarget && onJoinRoom\)/);
  assert.match(item, /onJoinRoom\(item\.roomTarget!\)/);
  assert.doesNotMatch(item, /item\.kind === "room" \? "presence_room_joined"/);
  assert.match(web, /HomeNowConnectedPanel/);
  assert.match(desktop, /HomeNowConnectedPanel/);
  assert.match(joinHook, /confirmedCrossContext/);
  assert.match(joinHook, /mediaHandoff\.connect\(target, result\)/);
  assert.match(voiceProvider, /joinRoom: \(session: VoiceSessionDescriptor\) => boolean/);
  assert.match(voiceProvider, /autoConnectPendingRef\.current = !existingControl/);
  assert.match(voiceProvider, /if \(state\.inside\)/);
  assert.match(voiceProvider, /return activeSession\?\.chatId === session\.chatId/);
});
