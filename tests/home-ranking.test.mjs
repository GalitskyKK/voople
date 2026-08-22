import assert from "node:assert/strict";
import test from "node:test";

import { scoreHomeContinue, scoreHomeNow } from "../src/lib/social/home-ranking.ts";

const nowMs = Date.parse("2026-08-22T12:00:00.000Z");

test("home now ranking follows the product weights", () => {
  assert.equal(scoreHomeNow({ activeRoom: true, nowMs }), 100);
  assert.equal(scoreHomeNow({ pinned: true, nowMs }), 50);
  assert.equal(scoreHomeNow({ playing: true, nowMs }), 35);
  assert.equal(scoreHomeNow({ listening: true, online: true, nowMs }), 20);
  assert.equal(scoreHomeNow({ online: true, nowMs }), 10);
  assert.equal(scoreHomeNow({ lastInteractionAt: "2026-08-22T08:00:00.000Z", nowMs }), 30);
  assert.equal(scoreHomeNow({ lastInteractionAt: "2026-08-20T12:00:00.000Z", nowMs }), 20);
  assert.equal(scoreHomeNow({ relationshipScore: 70, nowMs }), 20);
});

test("continue ranking prioritizes replies, unread and drafts", () => {
  assert.equal(scoreHomeContinue({ mentionOrReply: true, nowMs }), 100);
  assert.equal(scoreHomeContinue({ unreadCount: 2, nowMs }), 70);
  assert.equal(scoreHomeContinue({ hasDraft: true, nowMs }), 60);
  assert.equal(scoreHomeContinue({ lastInteractionAt: "2026-08-22T08:00:00.000Z", nowMs }), 40);
  assert.equal(scoreHomeContinue({ reciprocal: true, recentlyOpened: true, nowMs }), 35);
});
