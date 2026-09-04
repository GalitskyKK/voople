import "server-only";

import { coreRoomInviteUrl } from "@/lib/chat/core-room-invite-url";
import { getSiteUrl } from "@/lib/seo/site";
import { ChatAccessDeniedError, getChatMembershipRest } from "@/server/data/chat-access-rest";
import { listGroupMembersRest } from "@/server/data/chat-group-members-rest";
import {
  cancelCoreRoomInviteRest,
  getCoreRoomInviteSessionRest,
  getCoreRoomInviteGroupForSenderRest,
  listCoreRoomInvitesForSenderRest,
  listCoreRoomInvitePreviewsRest,
  respondToCoreRoomInviteRest,
  upsertCoreRoomInviteRest,
} from "@/server/data/core-room-invitations-rest";
import { filterUserIdsByPrivacyFieldRest } from "@/server/data/privacy-rest";
import type {
  CoreRoomInviteCandidate,
  CoreRoomInvitePreview,
} from "@/types/room-invitations";

async function requireRootGroupMember(groupId: string, userId: string) {
  const membership = await getChatMembershipRest(groupId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new ChatAccessDeniedError("Приглашения доступны только участникам основной группы");
  }
  return membership;
}

export async function listCoreRoomInviteCandidates(
  sessionId: string,
  userId: string,
): Promise<CoreRoomInviteCandidate[]> {
  const context = await getCoreRoomInviteSessionRest(sessionId, userId);
  await requireRootGroupMember(context.groupId, userId);
  const [members, sentInvites] = await Promise.all([
    listGroupMembersRest(context.groupId, userId),
    listCoreRoomInvitesForSenderRest(context, userId),
  ]);
  const excludedIds = new Set([userId, ...context.participantIds]);
  const candidates = members.filter((member) => !excludedIds.has(member.id));
  const allowedIds = new Set(await filterUserIdsByPrivacyFieldRest(
    candidates.map((candidate) => candidate.id),
    userId,
    "inviteScope",
  ));
  return candidates.flatMap((candidate) => {
    const sent = sentInvites.get(candidate.id);
    return allowedIds.has(candidate.id) ? [{
      id: candidate.id,
      username: candidate.username,
      displayName: candidate.displayName,
      avatarUrl: candidate.avatarUrl ?? null,
      invite: sent ? { ...sent, shareUrl: sent.status === "pending" ? coreRoomInviteUrl(sent.id, getSiteUrl()) : null } : null,
    }] : [];
  });
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

export async function cancelCoreRoomInvite(input: {
  inviteId: string;
  inviterId: string;
}) {
  const groupId = await getCoreRoomInviteGroupForSenderRest(input.inviteId, input.inviterId);
  await requireRootGroupMember(groupId, input.inviterId);
  return cancelCoreRoomInviteRest(input);
}

export async function listCoreRoomInvitePreviews(inviteIds: string[], userId: string) {
  const previews = await listCoreRoomInvitePreviewsRest(inviteIds, userId);
  const groupIds = [...new Set([...previews.values()].flatMap((preview) =>
    preview.groupId ? [preview.groupId] : [],
  ))];
  const memberships = new Map((await Promise.all(groupIds.map(async (groupId) => {
    try {
      const membership = await requireRootGroupMember(groupId, userId);
      return [groupId, membership] as const;
    } catch (error) {
      if (!(error instanceof ChatAccessDeniedError)) throw error;
      return [groupId, null] as const;
    }
  }))));
  const entries: Array<[string, CoreRoomInvitePreview]> = [...previews].map(([inviteId, preview]) => {
    const membership = preview.groupId ? memberships.get(preview.groupId) : null;
    if (!membership) {
      return [inviteId, {
        ...preview,
        status: preview.status === "pending" ? "expired" as const : preview.status,
        groupId: null,
        groupName: null,
        inviter: null,
        room: null,
      }];
    }
    return [inviteId, {
      ...preview,
      groupName: membership.name ?? "Группа",
    }];
  });
  return new Map(entries);
}

export async function getCoreRoomInvitePreview(inviteId: string, userId: string) {
  const previews = await listCoreRoomInvitePreviews([inviteId], userId);
  return previews.get(inviteId) ?? null;
}
