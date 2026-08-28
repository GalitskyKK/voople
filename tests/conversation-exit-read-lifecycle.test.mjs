import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { latestUnreadIncomingAt } from "../src/lib/chat/read-receipts.ts";

const read = (path) => readFileSync(path, "utf8");

test("read receipt is bounded by the latest unread incoming message", () => {
  assert.equal(latestUnreadIncomingAt([
    { id: "mine", isMine: true, readAt: null, createdAt: "2026-08-28T10:00:00.000Z" },
    { id: "read", isMine: false, readAt: "2026-08-28T10:01:30.000Z", createdAt: "2026-08-28T10:01:00.000Z" },
    { id: "old", isMine: false, readAt: null, createdAt: "2026-08-28T10:02:00.000Z" },
    { id: "latest", isMine: false, readAt: null, createdAt: "2026-08-28T10:03:00.000Z" },
  ]), "2026-08-28T10:03:00.000Z");
});

test("message queries are read-only and acknowledgement is time-bounded", () => {
  const data = read("src/server/data/chat-rest.ts");
  const markRead = data.match(/export async function markMessagesReadRest[\s\S]*?\n}/)?.[0] ?? "";
  const router = read("src/server/trpc/routers/chat-messages.ts");
  const observeMessages = router.match(/observeMessages:[\s\S]*?\n  }\),/)?.[0] ?? "";

  assert.doesNotMatch(observeMessages, /markMessagesRead/);
  assert.match(markRead, /\.lte\("created_at", throughAt\)/);
  assert.match(router, /throughAt: z\.string\(\)\.datetime\(\)/);
  assert.match(router, /markMessagesRead\(input\.chatId, ctx\.user\.id, input\.throughAt\)/);
});

test("the released getMessages contract remains compatible with older desktop clients", () => {
  const router = read("src/server/trpc/routers/chat-messages.ts");
  const legacy = router.match(/getMessages:[\s\S]*?\r?\n  }\),\r?\n  observeMessages:/)?.[0] ?? "";
  const desktop = read("desktop/src/chat/useDesktopChatThread.ts");

  assert.match(legacy, /markMessagesRead\(input\.chatId, ctx\.user\.id, throughAt\)/);
  assert.match(desktop, /client\.query\("chat\.observeMessages"/);
});

test("web and desktop only acknowledge a visible focused conversation", () => {
  const shared = read("src/lib/chat/read-receipts.ts");
  const web = read("src/hooks/useChatConversationAttention.ts");
  const desktop = read("desktop/src/chat/useDesktopChatThread.ts");

  assert.match(shared, /document\.visibilityState === "visible" && document\.hasFocus\(\)/);
  assert.match(web, /useChatReadReceipt\(chatId, messages\)/);
  assert.match(desktop, /canAcknowledgeConversation\(\)/);
  assert.match(desktop, /chat\.markRead/);
  assert.match(desktop, /throughAt: unreadThroughAt/);
});

test("Escape closes overlays before leaving the active conversation", () => {
  const exit = read("src/hooks/useConversationExit.ts");
  const sheet = read("src/components/ui/Sheet.tsx");
  const lightbox = read("src/components/media/MediaLightbox.tsx");
  const selection = read("src/components/chat/ChatSelectionController.tsx");

  assert.match(exit, /event\.defaultPrevented \|\| hasBlockingDialog\(\)/);
  assert.match(exit, /onExitRef\.current\(\)/);
  for (const source of [sheet, lightbox, selection]) {
    assert.match(source, /event\.preventDefault\(\)/);
    assert.match(source, /event\.stopPropagation\(\)/);
  }
});

test("web and desktop conversation controllers return to the inbox", () => {
  const web = read("src/components/chat/MessagesLayout.tsx");
  const desktop = read("desktop/src/adapters/DesktopMessagesAdapter.tsx");
  const sidebar = read("src/components/layout/DesktopSidebar.tsx");

  assert.match(web, /useConversationExit\([\s\S]*router\.replace\("\/messages"\)/);
  assert.match(desktop, /useConversationExit\([\s\S]*navigate\("\/messages"\)/);
  assert.match(sidebar, /isMessagesThreadPath\(pathname\)[\s\S]*router\.replace\("\/messages"\)/);
});
