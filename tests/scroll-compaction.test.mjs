import assert from "node:assert/strict";
import test from "node:test";

import { resolveScrollCompaction } from "../src/lib/layout/scroll-compaction.ts";

test("sticky surfaces compact only after meaningful downward scroll", () => {
  assert.equal(resolveScrollCompaction({ compact: false, previous: 72, current: 84 }), false);
  assert.equal(resolveScrollCompaction({ compact: false, previous: 84, current: 96 }), true);
  assert.equal(resolveScrollCompaction({ compact: false, previous: 96, current: 104 }), false);
});

test("sticky surfaces expand while moving up and always expand near the top", () => {
  assert.equal(resolveScrollCompaction({ compact: true, previous: 132, current: 120 }), false);
  assert.equal(resolveScrollCompaction({ compact: true, previous: 132, current: 128 }), true);
  assert.equal(resolveScrollCompaction({ compact: true, previous: 40, current: 24 }), false);
});
