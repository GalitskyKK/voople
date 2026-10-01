import assert from "node:assert/strict";
import test from "node:test";
import { deriveGroupGrade, isGroupChargeActive } from "../src/lib/groups/group-grade.ts";

test("Grade derives only from a validated active charge count", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 100, Number.MAX_SAFE_INTEGER].map(deriveGroupGrade),
    ["basic", "grade_i", "grade_i", "grade_ii", "grade_ii", "grade_iii", "grade_iii", "grade_iii"]);
  for (const value of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, "1", null]) {
    assert.throws(() => deriveGroupGrade(value), RangeError);
  }
});

test("charges use inclusive start, exclusive expiry, revocation and exact Group assignment", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const charge = { rootGroupId: "group-a", revokedAt: null,
    validFrom: "2026-10-01T12:00:00Z", validUntil: "2026-10-02T12:00:00Z" };
  assert.equal(isGroupChargeActive(charge, "group-a", now), true);
  for (const patch of [
    { validFrom: "2026-10-01T12:00:01Z" },
    { validUntil: now.toISOString() },
    { validUntil: "2026-09-30T12:00:00Z" },
    { revokedAt: "2026-10-01T11:00:00Z" },
    { rootGroupId: null }, { rootGroupId: "group-b" },
  ]) assert.equal(isGroupChargeActive({ ...charge, ...patch }, "group-a", now), false);
  assert.throws(() => isGroupChargeActive(charge, "group-a", new Date(NaN)), RangeError);
});
