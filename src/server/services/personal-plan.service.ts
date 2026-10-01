import "server-only";

import { resolvePersonalPlanCoverage } from "@/lib/personal-plans/personal-plan";
import { loadActivePersonalPlanGrantsRest } from "@/server/data/personal-plan-grants-rest";
import type { PersonalPlanSnapshot } from "@/types/personal-plan";

/** Dormant facts only: no issuer, billing adapter, capabilities or selected plan. */
export async function getPersonalPlanStatus(userId: string, evaluatedAt = new Date()): Promise<PersonalPlanSnapshot> {
  const timestamp = new Date(evaluatedAt.toISOString());
  const grants = await loadActivePersonalPlanGrantsRest(userId, timestamp);
  return resolvePersonalPlanCoverage(grants, timestamp);
}
