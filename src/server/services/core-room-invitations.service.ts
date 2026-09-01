import "server-only";

import { getChatMembershipRest } from "@/server/data/chat-access-rest";
import { listGroupMembersRest } from "@/server/data/chat-group-members-rest";
import {
  getCoreRoomInviteSessionRest,
  respondToCoreRoomInviteRest,
  upsertCoreRoomInviteRest,
} from "@/server/data/core-room-invitations-rest";
import { filterUserIdsByPrivacyFieldRest } from "@/server/data/privacy-rest";
import type { CoreRoomInviteCandidate } from "@/types/room-invitations";

async function requireRootGroupMember(groupId: string, userId: string) {
  const membership = await getChatMembershipRest(groupId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Приглашения доступны только участникам основной группы");
  }
  return membership;
}

export async function listCoreRoomInviteCandidates(
  sessionId: string,
  userId: string,
): Promise<CoreRoomInviteCandidate[]> {
  const context = await getCoreRoomInviteSessionRest(sessionId, userId);
  await requireRootGroupMember(context.groupId, userId);
  const members = await listGroupMembersRest(context.groupId, userId);
  const excludedIds = new Set([userId, ...context.participantIds]);
  const candidates = members.filter((member) => !excludedIds.has(member.id));
  const allowedIds = new Set(await filterUserIdsByPrivacyFieldRest(
    candidates.map((candidate) => candidate.id),
    userId,
    "inviteScope",
  ));
  return candidates.flatMap((candidate) => allowedIds.has(candidate.id) ? [{
    id: candidate.id,
    username: candidate.username,
    displayName: candidate.displayName,
    avatarUrl: candidate.avatarUrl ?? null,
  }] : []);
}

export async function sendCoreRoomInvite(input: {
  sessionId: string;
  inviterId: string;
  inviteeId: string;
}) {
  if (input.inviterId === input.inviteeId) throw new Error("Нельзя пригласить самого себя");
  const context = await getCoreRoomInviteSessionRest(input.sessionId, input.inviterId);
  await Promise.all([
    requireRootGroupMember(context.groupId, input.inviterId),
    requireRootGroupMember(context.groupId, input.inviteeId),
  ]);
  if (context.participantIds.includes(input.inviteeId)) {
    throw new Error("Пользователь уже находится в комнате");
  }
  const allowedIds = await filterUserIdsByPrivacyFieldRest(
    [input.inviteeId],
    input.inviterId,
    "inviteScope",
  );
  if (!allowedIds.includes(input.inviteeId)) {
    throw new Error("Пользователь запретил приглашения от вас");
  }
  return upsertCoreRoomInviteRest({
    context,
    inviterId: input.inviterId,
    inviteeId: input.inviteeId,
  });
}

export function respondToCoreRoomInvite(input: {
  inviteId: string;
  userId: string;
  response: "accepted" | "declined";
}) {
  return respondToCoreRoomInviteRest(input);
}
