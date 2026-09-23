import "server-only";

import { getLiveMoveConsentsForPreviewRest, getLiveMoveStatusRest } from "@/server/data/live-move-rest";
import { loadGroupNowUsersRest } from "@/server/data/group-now-rest";
import { filterUnblockedUserIdsRest } from "@/server/data/user-blocks-rest";
import { getGroupNow } from "@/server/services/group-now.service";
import type { CoreRoomInvitePreview, CoreRoomInviteStatus } from "@/types/room-invitations";

export async function listLiveMoveInvitePreviews(consentIds: string[], actorId: string) {
  const consents = await getLiveMoveConsentsForPreviewRest(consentIds, actorId);
  if (!consents.length) return new Map<string, CoreRoomInvitePreview>();
  const requests = await Promise.all(consents.map((consent) =>
    getLiveMoveStatusRest(consent.requestId, actorId)));
  const inviterIds = [...new Set(requests.map((request) => request.inviterId))];
  const visibleInviterIds = await filterUnblockedUserIdsRest(actorId, inviterIds);
  const users = await loadGroupNowUsersRest(visibleInviterIds);
  const output = new Map<string, CoreRoomInvitePreview>();
  for (let index = 0; index < consents.length; index += 1) {
    const consent = consents[index]!;
    const request = requests[index]!;
    const now = await getGroupNow(request.groupId, actorId).catch(() => null);
    const source = now?.rooms.find((room) => room.liveSessionId === request.sourceSessionId) ?? null;
    const target = request.targetSessionId
      ? now?.rooms.find((room) => room.liveSessionId === request.targetSessionId) ?? null
      : null;
    const inviterId = request.inviterId;
    const status = request.status === "pending"
      ? consent.status as CoreRoomInviteStatus
      : request.status === "completed" ? "accepted" : request.status;
    output.set(consent.id, {
      id: consent.id,
      intent: request.mode,
      status,
      requestId: request.id,
      requestStatus: request.status,
      acceptedCount: request.acceptedCount,
      selectedCount: request.selectedCount,
      expiresAt: request.expiresAt,
      groupId: request.groupId,
      groupName: null,
      inviter: users.get(inviterId) ?? null,
      room: request.status === "completed" ? target : source,
    });
  }
  return output;
}
