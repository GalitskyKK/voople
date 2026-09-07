import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core group Room navigation is shared, gated and falls back to legacy Room", async () => {
  const [router, action, lobbyAction, panel, launcher, webHeader, webDrawer, publicGroup, publicGroupView, desktop, desktopHeader, desktopPublicGroup] = await Promise.all([
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupRoomAction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupLobbyAction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowVoicePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hooks/useGroupNowVoiceLauncher.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/ChatWindowHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupInfoDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/PublicGroupPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/PublicGroupPageView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopChatThreadAdapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopChatRoomHeaderAction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopPublicGroupAdapter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(router, /coreRoomAvailability: protectedProcedure\.query/);
  assert.match(router, /getServerFeatureAccess\("multi_room_groups", ctx\.user\.id\)\.enabled/);
  assert.doesNotMatch(router, /coreRoomAvailability:[\s\S]*?reason:/);

  assert.match(action, /coreRoomAvailability\.useQuery/);
  assert.match(action, /if \(!availability\.data\?\.enabled\)/);
  assert.match(action, /<VoiceRoomButton/);
  assert.match(action, /<GroupNowVoicePanel/);
  assert.match(action, /enabled=\{open\}/);
  assert.match(action, /onRoomOpened=\{\(\) => setOpen\(false\)\}/);
  assert.match(panel, /useGroupNowVoiceLauncher/);
  assert.match(launcher, /onRoomOpened\?\.\(\)/);

  assert.match(lobbyAction, /coreGroupNow\.useQuery/);
  assert.match(lobbyAction, /room\.kind === "lobby"/);
  assert.match(lobbyAction, /useGroupNowRoomJoin/);
  assert.match(lobbyAction, /launcher\.voice\.openPanel\(\)/);
  assert.match(lobbyAction, /const targetRoom = currentRoom \?\? lobby/);
  assert.match(lobbyAction, /requestJoin\(\{ groupId, room: targetRoom \}\)/);
  assert.match(lobbyAction, /Войти в Лобби/);
  assert.match(lobbyAction, /<VoiceRoomButton/);

  assert.match(webHeader, /<GroupLobbyAction/);
  assert.match(webDrawer, /<GroupRoomAction/);
  assert.match(publicGroup, /group\.joined \? \(/);
  assert.match(publicGroup, /<GroupRoomAction/);
  assert.match(publicGroupView, /roomAction\?: ReactNode/);
  assert.match(desktop, /<GroupRoomAction/);
  assert.match(desktop, /<DesktopChatRoomHeaderAction/);
  assert.match(desktopHeader, /<GroupLobbyAction/);
  assert.match(desktopHeader, /<VoiceRoomButton/);
  assert.match(desktopPublicGroup, /group\.joined \? \(/);
  assert.match(desktopPublicGroup, /<GroupRoomAction/);
  assert.doesNotMatch(webHeader, /enabled=\{true\}/);
  assert.doesNotMatch(desktop, /enabled=\{true\}/);
});
