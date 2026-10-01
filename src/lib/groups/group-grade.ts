import type { GroupCharge, GroupGrade } from "../../types/group-grade";

export function deriveGroupGrade(activeChargeCount: number): GroupGrade {
  if (!Number.isSafeInteger(activeChargeCount) || activeChargeCount < 0) {
    throw new RangeError("Active charge count must be a non-negative safe integer");
  }
  if (activeChargeCount >= 5) return "grade_iii";
  if (activeChargeCount >= 3) return "grade_ii";
  if (activeChargeCount >= 1) return "grade_i";
  return "basic";
}

/** Half-open validity interval; no legacy Boost grace or subscription inference. */
export function isGroupChargeActive(charge: GroupCharge, rootGroupId: string, evaluatedAt: Date) {
  const now = evaluatedAt.getTime();
  if (!Number.isFinite(now)) throw new RangeError("Invalid Grade evaluation timestamp");
  return charge.rootGroupId === rootGroupId
    && charge.revokedAt === null
    && Date.parse(charge.validFrom) <= now
    && now < Date.parse(charge.validUntil);
}
