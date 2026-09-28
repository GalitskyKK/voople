import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("web and desktop preserve the conversation while surfacing network state", () => {
  const state = read("src/components/chat/ChatConversationState.tsx");
  const frame = read("src/components/chat/ChatThreadFrameView.tsx");
  const web = read("src/components/chat/ChatWindow.tsx");
  const desktop = read("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const desktopThread = read("desktop/src/chat/useDesktopChatThread.ts");

  assert.match(state, /"loading" \| "offline" \| "error"/);
  assert.match(state, /Черновик останется на месте/);
  assert.match(state, /variant\?: "panel" \| "inline"/);
  assert.match(frame, /\{connectionState\}\s+\{composer\}/);
  assert.match(web, /useBrowserOnline/);
  assert.match(web, /data\)[\s\S]*ChatConversationState/);
  assert.match(web, /mode="offline" variant="inline"/);
  assert.match(desktop, /useBrowserOnline/);
  assert.match(desktop, /mode="offline" variant="inline"/);
  assert.match(desktopThread, /trpc\.chat\.observeMessages\.useQuery/);
  assert.match(desktopThread, /data: query\.data \?\? null/);
  assert.match(desktopThread, /query\.error\?\.message/);
});
