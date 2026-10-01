export type GroupGrade = "basic" | "grade_i" | "grade_ii" | "grade_iii";

export type GroupChargeOrigin = "included_voople_plus" | "standalone";

/** Server-normalized grant. Source references never enter the public snapshot. */
export type GroupCharge = {
  id: string;
  ownerUserId: string;
  rootGroupId: string | null;
  origin: GroupChargeOrigin;
  validFrom: string;
  validUntil: string;
  revokedAt: string | null;
};

export type GroupCapabilityDecision =
  | { state: "active"; reason: "free_core" }
  | { state: "unconfigured"; reason: "premium_policy_pending" };

/** Aggregate policy slots, not a promised premium benefit catalog. */
export type GroupGradeCapabilities = {
  freeCore: GroupCapabilityDecision;
  premiumBenefits: GroupCapabilityDecision;
};

export type GroupGradeSnapshot = {
  rootGroupId: string;
  activeChargeCount: number;
  grade: GroupGrade;
  evaluatedAt: string;
  policyVersion: "group-grade-v1";
  capabilities: GroupGradeCapabilities;
};
