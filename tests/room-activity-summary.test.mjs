import assert from "node:assert/strict";
import test from "node:test";

import { summarizeGroupRoomActivity } from "../src/lib/chat/room-activity.ts";

test("group room events collapse into one daily duration summary", () => {
  const events = [
    { dayKey: "2026-08-22", event: "started", durationSeconds: null, roomKind: "group" },
    { dayKey: "2026-08-22", event: "ended", durationSeconds: 1200, roomKind: "group" },
    { dayKey: "2026-08-22", event: "ended", durationSeconds: 600, roomKind: "group" },
  ];
  const summary = summarizeGroupRoomActivity(events).get("2026-08-22");
  assert.equal(summary?.durationSeconds, 1800);
  assert.equal(summary?.sessions, 2);
});

test("direct call events remain individual timeline messages", () => {
  const summaries = summarizeGroupRoomActivity([{ dayKey: "2026-08-22", event: "ended", durationSeconds: 45, roomKind: "direct" }]);
  assert.equal(summaries.size, 0);
});
