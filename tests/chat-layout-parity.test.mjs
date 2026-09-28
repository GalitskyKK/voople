import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bubble = readFileSync(new URL("../src/components/chat/ChatMessageBubbleVisual.tsx", import.meta.url), "utf8");
const grouping = readFileSync(new URL("../src/lib/chat/group-messages.ts", import.meta.url), "utf8");
const webThread = readFileSync(new URL("../src/components/chat/ChatWindow.tsx", import.meta.url), "utf8");
const desktopThread = readFileSync(new URL("../desktop/src/adapters/DesktopChatThreadAdapter.tsx", import.meta.url), "utf8");

test("web and desktop share one left-aligned dense message stream", () => {
  assert.match(bubble, /voople-chat-stream-row/);
  assert.match(bubble, /items-start/);
  assert.match(bubble, /groupPosition === "only" \|\| groupPosition === "start"/);
  assert.doesNotMatch(bubble, /isMine \? "justify-end"/);
  assert.doesNotMatch(bubble, /rounded-\[1\.15rem\]/);
  assert.match(bubble, /· вы/);
  assert.match(grouping, /first\.replyTo \|\| second\.replyTo/);
  assert.match(webThread, /showSender/);
  assert.match(desktopThread, /showSender/);
});
