import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  activeMessagesChatId,
  groupSurfaceFromPath,
} from "../src/lib/layout/messages-path.ts";

test("messenger surface links preserve the chat id and accept only known tabs", () => {
  assert.equal(activeMessagesChatId("/messages/abc?surface=now"), "abc");
  assert.equal(groupSurfaceFromPath("/messages/abc?surface=now"), "now");
  assert.equal(groupSurfaceFromPath("/messages/abc?surface=people"), "people");
  assert.equal(groupSurfaceFromPath("/messages/abc?surface=unknown"), "chat");
  assert.equal(groupSurfaceFromPath("/messages/abc"), "chat");
});

test("web and desktop pass the requested group surface into the shared shell", () => {
  const page = readFileSync(new URL("../src/app/(main)/messages/[chatId]/page.tsx", import.meta.url), "utf8");
  const web = readFileSync(new URL("../src/components/chat/ChatWindow.tsx", import.meta.url), "utf8");
  const desktopShell = readFileSync(new URL("../desktop/src/shell/DesktopShell.tsx", import.meta.url), "utf8");
  const desktopThread = readFileSync(new URL("../desktop/src/adapters/DesktopChatThreadAdapter.tsx", import.meta.url), "utf8");

  assert.match(page, /searchParams: Promise/);
  assert.match(page, /initialGroupTab=\{initialGroupTab\}/);
  assert.match(web, /initialTab: initialGroupTab/);
  assert.match(desktopShell, /groupSurfaceFromPath\(pathname\)/);
  assert.match(desktopThread, /initialTab: initialGroupTab/);
});
