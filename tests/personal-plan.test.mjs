import assert from "node:assert/strict";
import test from "node:test";
import { resolvePersonalPlanCoverage, isPersonalPlanGrantActive } from "../src/lib/personal-plans/personal-plan.ts";

const now = new Date("2026-10-01T12:00:00Z");
const grant = (planKind = "style", patch = {}) => ({ id: "grant", userId: "user", planKind,
  validFrom: now.toISOString(), validUntil: "2026-11-01T00:00:00Z", revokedAt: null, ...patch });

test("personal coverage preserves independent facts and same-kind overlap", () => {
  for (const [kinds, coverage] of [
    [[], { style: false, full: false }], [["style"], { style: true, full: false }],
    [["full"], { style: false, full: true }], [["style", "full"], { style: true, full: true }],
    [["style", "style"], { style: true, full: false }], [["full", "full"], { style: false, full: true }],
  ]) {
    const result = resolvePersonalPlanCoverage(kinds.map((kind) => grant(kind)), now);
    assert.deepEqual(result, { coverage, simultaneousCoverage: coverage.style && coverage.full,
      evaluatedAt: now.toISOString(), policyVersion: 1 });
  }
});

test("personal grants use inclusive start, exclusive end and unconditional revocation", () => {
  assert.equal(isPersonalPlanGrantActive(grant(), now), true);
  for (const patch of [{ validFrom: "2026-10-01T12:00:01Z" }, { validUntil: now.toISOString(), validFrom: "2026-09-01T00:00:00Z" },
    { revokedAt: "2026-10-02T00:00:00Z" }]) {
    assert.equal(isPersonalPlanGrantActive(grant("style", patch), now), false);
    assert.deepEqual(resolvePersonalPlanCoverage([grant("style", patch)], now).coverage, { style: false, full: false });
  }
});

test("invalid kinds, dates and windows are errors", () => {
  for (const patch of [{ planKind: "plus" }, { validUntil: now.toISOString() }, { validUntil: "infinity" },
    { validFrom: "not-a-date" }, { revokedAt: "bad" }]) {
    assert.throws(() => resolvePersonalPlanCoverage([grant("style", patch)], now));
  }
  assert.throws(() => resolvePersonalPlanCoverage([], new Date(NaN)));
});
