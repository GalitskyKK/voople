export type PersonalPlanKind = "style" | "full";

/** Server-side validated grant facts; never a legacy subscription tier. */
export interface PersonalPlanGrant {
  id: string;
  userId: string;
  planKind: PersonalPlanKind;
  validFrom: string;
  validUntil: string;
  revokedAt: string | null;
}

export interface PersonalPlanSnapshot {
  coverage: { style: boolean; full: boolean };
  simultaneousCoverage: boolean;
  evaluatedAt: string;
  policyVersion: number;
}
