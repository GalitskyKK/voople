import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isRoomTimelineMessage } from "../src/lib/chat/chat-list-preview.ts";

test("room timeline events never become the dialog-list preview", () => {
  assert.equal(
    isRoomTimelineMessage([
      {
        type: "roomEvent",
        event: "ended",
        durationSeconds: 42,
        roomKind: "direct",
      },
    ]),
    true,
  );
  assert.equal(
    isRoomTimelineMessage([{ type: "text", text: "Обычное сообщение" }]),
    false,
  );
  assert.equal(isRoomTimelineMessage(null), false);
});

test("chat list data skips room events before choosing the latest message", () => {
  const source = readFileSync("src/server/data/chat-rest.ts", "utf8");

  assert.match(source, /select\("chat_id, text, content,/);
  assert.match(source, /if \(isRoomTimelineMessage\(m\.content\)\) continue;/);
});
