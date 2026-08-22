import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bubble = readFileSync(new URL("../src/components/chat/ChatMessageBubbleVisual.tsx", import.meta.url), "utf8");

test("own messages stay on the outgoing side at every desktop width", () => {
  assert.match(bubble, /isMine \? "justify-end" : "justify-start"/);
  assert.doesNotMatch(bubble, /2xl:justify-start/);
  assert.doesNotMatch(bubble, /2xl:block/);
});
