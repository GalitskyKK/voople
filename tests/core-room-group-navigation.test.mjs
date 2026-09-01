import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("core group Room navigation is shared, gated and falls back to legacy Room", async () => {
  const [router, action, panel, webHeader, webDrawer, desktop, desktopHeader] = await Promise.all([
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupRoomAction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowVoicePanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/ChatWindowHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupInfoDrawer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopChatThreadAdapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../desktop/src/adapters/DesktopChatRoomHeaderAction.tsx", import.meta.url), "utf8"),
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
  assert.match(panel, /onRoomOpened\?\.\(\)/);

  assert.match(webHeader, /<GroupRoomAction/);
  assert.match(webDrawer, /<GroupRoomAction/);
  assert.match(desktop, /<GroupRoomAction/);
  assert.match(desktop, /<DesktopChatRoomHeaderAction/);
  assert.match(desktopHeader, /<GroupRoomAction/);
  assert.match(desktopHeader, /<VoiceRoomButton/);
  assert.doesNotMatch(webHeader, /enabled=\{true\}/);
  assert.doesNotMatch(desktop, /enabled=\{true\}/);
});
