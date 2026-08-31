import "server-only";

import { buildGroupNowView } from "@/lib/chat/group-now";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { getVisibleGroupRoomPresenceRest } from "@/server/data/chat-group-room-presence-rest";
import {
  loadGroupNowSnapshotRest,
  loadGroupNowUsersRest,
} from "@/server/data/group-now-rest";
import {
  filterUserIdsByPrivacyFieldRest,
  listVisibleOnlineUserIdsRest,
} from "@/server/data/privacy-rest";
import type { GroupNowView } from "@/types/group-now";

export async function getGroupNow(
  groupId: string,
  viewerId: string,
): Promise<GroupNowView> {
  const membership = await assertChatMemberRest(groupId, viewerId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Экран «Сейчас» доступен только для основной группы");
  }

  const [snapshot, legacyPresence, visibleOnlineIds] = await Promise.all([
    loadGroupNowSnapshotRest(groupId),
    getVisibleGroupRoomPresenceRest(membership, viewerId),
    listVisibleOnlineUserIdsRest(viewerId),
  ]);
  const memberIds = new Set(snapshot.memberIds);
  const participantIds = snapshot.participants
    .map((participant) => participant.userId)
    .filter((userId) => memberIds.has(userId));
  const visibleParticipantIds = new Set(
    await filterUserIdsByPrivacyFieldRest(
      participantIds,
      viewerId,
      "roomsScope",
    ),
  );
  const onlineMemberIds = visibleOnlineIds.filter((userId) => memberIds.has(userId));
  const legacyUserIds = [...legacyPresence.keys()].filter((userId) => memberIds.has(userId));
  const users = await loadGroupNowUsersRest([
    ...visibleParticipantIds,
    ...legacyUserIds,
    ...onlineMemberIds,
  ]);

  return buildGroupNowView({
    groupId,
    groupName: membership.name?.trim() || "Группа",
    viewerId,
    rooms: snapshot.rooms,
    sessions: snapshot.sessions,
    participants: snapshot.participants.flatMap((participant) => {
      const user = users.get(participant.userId);
      if (!user || !visibleParticipantIds.has(participant.userId)) return [];
      return [{
        sessionId: participant.sessionId,
        user,
        micMuted: participant.micMuted,
        cameraEnabled: participant.cameraEnabled,
        screenSharing: participant.screenSharing,
      }];
    }),
    legacyPresence: legacyUserIds.flatMap((userId) => {
      const room = legacyPresence.get(userId);
      const user = users.get(userId);
      if (!room || !user) return [];
      return [{ chatId: room.chatId, roomName: room.name, user }];
    }),
    onlineUsers: onlineMemberIds.flatMap((userId) => {
      const user = users.get(userId);
      return user ? [user] : [];
    }),
  });
}
