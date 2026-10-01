import "server-only";

import { deriveGroupGrade } from "@/lib/groups/group-grade";
import { ChatAccessDeniedError, getChatMembershipRest } from "@/server/data/chat-access-rest";
import { loadActiveGroupChargesRest } from "@/server/data/group-charges-rest";
import { GROUP_GRADE_POLICY_VERSION, resolveGroupGradeCapabilities } from "./group-grade-capabilities";
import type { GroupGradeSnapshot } from "@/types/group-grade";

/** Membership (including restricted-section access) is checked before any charge read. */
export async function getGroupGrade(chatId: string, userId: string, evaluatedAt = new Date()): Promise<GroupGradeSnapshot> {
  const timestamp = evaluatedAt.toISOString();
  const membership = await getChatMembershipRest(chatId, userId);
  if (membership.type !== "group") throw new ChatAccessDeniedError("Group Grade requires a Group");
  const rootGroupId = membership.accessChatId;
  const charges = await loadActiveGroupChargesRest(rootGroupId, new Date(timestamp));
  const activeChargeCount = charges.length;
  const grade = deriveGroupGrade(activeChargeCount);
  return {
    rootGroupId,
    activeChargeCount,
    grade,
    evaluatedAt: timestamp,
    policyVersion: GROUP_GRADE_POLICY_VERSION,
    capabilities: resolveGroupGradeCapabilities(grade),
  };
}
