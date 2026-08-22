import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeGroupJoinPolicy,
  normalizeGroupVisibility,
} from "../src/lib/chat/group-access.ts";

test("group discovery accepts only canonical visibility values", () => {
  assert.equal(normalizeGroupVisibility("public"), "public");
  assert.equal(normalizeGroupVisibility("unlisted"), "unlisted");
  assert.equal(normalizeGroupVisibility("private"), "private");
  assert.equal(normalizeGroupVisibility("PUBLIC"), "private");
  assert.equal(normalizeGroupVisibility(null), "private");
});

test("group join policy defaults closed for unknown database values", () => {
  assert.equal(normalizeGroupJoinPolicy("open"), "open");
  assert.equal(normalizeGroupJoinPolicy("request"), "request");
  assert.equal(normalizeGroupJoinPolicy("invite_only"), "invite_only");
  assert.equal(normalizeGroupJoinPolicy("legacy"), "invite_only");
  assert.equal(normalizeGroupJoinPolicy(undefined), "invite_only");
});
