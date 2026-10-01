import type { PersonalPlanGrant, PersonalPlanSnapshot } from "../../types/personal-plan";

export const PERSONAL_PLAN_POLICY_VERSION = 1;

/** Validate facts before resolving half-open coverage; overlap is not precedence. */
export function isPersonalPlanGrantActive(grant: PersonalPlanGrant, evaluatedAt: Date): boolean {
  const now = evaluatedAt.getTime();
  const from = Date.parse(grant.validFrom);
  const until = Date.parse(grant.validUntil);
  if (!Number.isFinite(now)) throw new RangeError("Invalid personal-plan evaluation timestamp");
  if (grant.planKind !== "style" && grant.planKind !== "full") throw new TypeError("Invalid personal plan kind");
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from
    || (grant.revokedAt !== null && !Number.isFinite(Date.parse(grant.revokedAt)))) {
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
