import type { PersonalPlanGrant, PersonalPlanSnapshot } from "../../types/personal-plan";
import { personalPlanInstant } from "./timestamp.ts";

export const PERSONAL_PLAN_POLICY_VERSION = 1;

/** Validate facts before resolving half-open coverage; overlap is not precedence. */
export function isPersonalPlanGrantActive(grant: PersonalPlanGrant, evaluatedAt: Date): boolean {
  const now = personalPlanInstant(evaluatedAt.toISOString());
  const from = personalPlanInstant(grant.validFrom);
  const until = personalPlanInstant(grant.validUntil);
  if (grant.planKind !== "style" && grant.planKind !== "full") throw new TypeError("Invalid personal plan kind");
  if (grant.revokedAt !== null) personalPlanInstant(grant.revokedAt);
  if (until <= from) {
    throw new RangeError("Invalid personal-plan validity window");
  }
  return grant.revokedAt === null && from <= now && now < until;
}

export function resolvePersonalPlanCoverage(grants: readonly PersonalPlanGrant[], evaluatedAt: Date): PersonalPlanSnapshot {
  const timestamp = evaluatedAt.toISOString();
  const coverage = { style: false, full: false };
  for (const grant of grants) {
    if (isPersonalPlanGrantActive(grant, evaluatedAt)) coverage[grant.planKind] = true;
  }
  return {
    coverage,
    simultaneousCoverage: coverage.style && coverage.full,
    evaluatedAt: timestamp,
    policyVersion: PERSONAL_PLAN_POLICY_VERSION,
  };
}
