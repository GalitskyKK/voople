import "server-only";

import type { GroupGrade, GroupGradeCapabilities } from "@/types/group-grade";

export const GROUP_GRADE_POLICY_VERSION = "group-grade-v1" as const;

export function resolveGroupGradeCapabilities(_grade: GroupGrade): GroupGradeCapabilities {
  // No Grade-to-premium-benefit matrix has been accepted yet.
  void _grade;
  return {
    freeCore: { state: "active", reason: "free_core" },
    premiumBenefits: { state: "unconfigured", reason: "premium_policy_pending" },
  };
}
