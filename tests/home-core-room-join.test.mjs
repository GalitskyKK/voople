import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Home exposes every active core Room only after membership and privacy gates", async () => {
  const [data, service, types] = await Promise.all([
    readFile(new URL("../src/server/data/home-core-rooms-rest.ts", import.meta.url), "utf8"),
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
  assert.match(service, /listActiveCoreRoomsRest\(rootGroupIds, userId\)/);
  assert.match(service, /getServerFeatureAccess\("multi_room_groups", userId\)\.enabled/);
  assert.match(service, /coreRoomsEnabled[\s\S]+\? listActiveCoreRoomsRest/);
  assert.match(service, /id: `core-room:\$\{room\.id\}`/);
  assert.match(service, /conversationId: groupId/);
  assert.match(service, /activeConversationIds/);
  assert.match(service, /continueWithoutActiveRooms/);
  assert.match(types, /export type HomeRoomTarget/);
  assert.match(types, /roomTarget\?: HomeRoomTarget/);
});

test("Home Room CTA performs the shared session-bound join on web and desktop", async () => {
  const [controller, view, item, web, desktop, joinHook] = await Promise.all([
    readFile(new URL("../src/components/home/HomeNowConnectedPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeOverviewPanelsView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeNowItem.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/home/HomeOverviewPanels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopFeedAdapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useGroupNowRoomJoin.ts", import.meta.url), "utf8"),
  ]);

  assert.match(controller, /useGroupNowRoomJoin/);
  assert.match(controller, /voice\.openCoreRoom/);
  assert.match(controller, /voice\.openRoom/);
  assert.match(controller, /presence_room_joined/);
  assert.match(controller, /GroupNowRoomSwitchDialog/);
  assert.match(view, /HomeNowItemView/);
  assert.match(item, /if \(item\.roomTarget && onJoinRoom\)/);
  assert.match(item, /onJoinRoom\(item\.roomTarget!\)/);
  assert.doesNotMatch(item, /item\.kind === "room" \? "presence_room_joined"/);
  assert.match(web, /HomeNowConnectedPanel/);
  assert.match(desktop, /HomeNowConnectedPanel/);
  assert.match(joinHook, /confirmedCrossContext/);
  assert.match(joinHook, /mediaHandoff\.connect\(target, result\)/);
});
