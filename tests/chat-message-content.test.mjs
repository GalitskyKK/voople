import assert from "node:assert/strict";
import test from "node:test";

import {
  parseComposerContent,
  structuredContentFallback,
} from "../src/lib/chat/message-content.ts";

const emojis = [
  {
    id: "emoji-chill",
    name: "chill_guy",
    url: "https://cdn.voople.ru/chill.webp",
    animated: false,
    createdBy: "user-1",
  },
];

test("composer replaces only known group emoji shortcodes", () => {
  assert.deepEqual(parseComposerContent("Привет :chill_guy: :deleted:", emojis), [
    { type: "text", text: "Привет " },
    { type: "customEmoji", emojiId: "emoji-chill" },
    { type: "text", text: " :deleted:" },
  ]);
});

test("structured fallback remains readable for emoji and gift nodes", () => {
  assert.equal(
    structuredContentFallback([
      { type: "text", text: "Смотри " },
      { type: "customEmoji", emojiId: "emoji-chill", name: "chill_guy", url: null },
      { type: "text", text: " — " },
      { type: "gift", itemId: "gift-1", itemName: "Неоновая рамка", message: null },
    ]),
    "Смотри :chill_guy: — 🎁 Подарок: Неоновая рамка",
  );
});

test("room event fallback includes a compact human duration", () => {
  assert.equal(
    structuredContentFallback([{ type: "roomEvent", event: "ended", durationSeconds: 3725 }]),
    "Встреча завершена · 1 ч 2 мин",
  );
});

test("room timeline distinguishes a group room from a direct call", () => {
  assert.equal(
    structuredContentFallback([{ type: "roomEvent", event: "started", durationSeconds: null, roomKind: "group" }]),
    "Комната открыта",
  );
});
