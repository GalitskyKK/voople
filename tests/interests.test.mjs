import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_GROUP_TOPICS,
  MAX_USER_INTERESTS,
  uniqueInterestSlugs,
} from "../src/lib/social/interests.ts";

test("interest limits match the product contract", () => {
  assert.equal(MAX_USER_INTERESTS, 10);
  assert.equal(MAX_GROUP_TOPICS, 5);
});

test("interest selection is unique and bounded", () => {
  assert.deepEqual(uniqueInterestSlugs(["linux", " linux ", "ui-ux"], 10), ["linux", "ui-ux"]);
  assert.throws(() => uniqueInterestSlugs(["a", "b", "c"], 2), /не больше 2/);
});
