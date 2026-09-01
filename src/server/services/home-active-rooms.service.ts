import "server-only";

import { scoreHomeNow } from "@/lib/social/home-ranking";
import { listActiveCoreRoomsRest } from "@/server/data/home-core-rooms-rest";
import { getActiveRoomPresenceRest } from "@/server/data/home-overview-rest";
import { toHomeDirectItem, toHomeGroupItem } from "@/server/mappers/home-chat-item";
import { listChats } from "@/server/services/chat.service";
import { getServerFeatureAccess } from "@/server/services/product-feature-access.service";
import type { ChatListItem } from "@/types/chat";
import type { GroupNowRoom } from "@/types/group-now";
import type { HomeActiveRoomsView, HomeNowItem, HomeRoomTarget } from "@/types/home";

export async function listActiveHomeRoomItems(
  chats: ChatListItem[],
  userId: string,
): Promise<HomeNowItem[]> {
  const rootChats = chats.filter((chat) => !chat.parentChatId);
  const direct = rootChats
    .map((chat) => toHomeDirectItem(chat, userId))
    .filter((item): item is HomeNowItem => Boolean(item));
  const groups = rootChats
    .map((chat) => toHomeGroupItem(chat, userId))
    .filter((item): item is HomeNowItem => Boolean(item));
  const rootGroupIds = groups.map((group) => group.id);
  const coreRoomsEnabled = getServerFeatureAccess("multi_room_groups", userId).enabled;
  const [legacyPresence, coreRooms] = await Promise.all([
    getActiveRoomPresenceRest(rootChats.map((chat) => chat.id), userId),
    coreRoomsEnabled
      ? listActiveCoreRoomsRest(rootGroupIds, userId)
      : Promise.resolve([]),
  ]);

  const groupById = new Map(groups.map((item) => [item.id, item]));
  const activeCoreRooms = coreRooms.flatMap(({ groupId, room }): HomeNowItem[] => {
    const group = groupById.get(groupId);
    if (!group) return [];
    return [{
      ...group,
      id: `core-room:${room.id}`,
      conversationId: groupId,
      roomTarget: { context: "group", groupId, room },
      kind: "room",
      activity: "in_room",
      score: scoreHomeNow({ activeRoom: true, pinned: group.pinned }),
      subtitle: `${room.name} · ${room.participantCount} в комнате · Зайти`,
      participants: room.participants,
    }];
  });
  const coreParticipantIdsByGroup = new Map<string, Set<string>>();
  for (const target of coreRooms) {
    const participantIds = coreParticipantIdsByGroup.get(target.groupId) ?? new Set<string>();
    for (const participant of target.room.participants) participantIds.add(participant.id);
    coreParticipantIdsByGroup.set(target.groupId, participantIds);
  }

  const activeLegacyRooms = [...groups, ...direct].flatMap((item): HomeNowItem[] => {
    const coreParticipantIds = coreParticipantIdsByGroup.get(item.id);
    const participants = (legacyPresence.get(item.id) ?? []).filter(
      (participant) => !coreParticipantIds?.has(participant.id),
    );
    if (!participants.length) return [];
    const room: GroupNowRoom = {
      id: `legacy:${item.id}`,
      kind: item.userId ? "temporary" : "lobby",
      name: item.title,
      joinTarget: { kind: "legacy", chatId: item.id },
      state: "active",
      liveSessionId: null,
      startedAt: null,
      startedBy: null,
      participantCount: participants.length,
      hasScreenShare: false,
      participants: participants.map((participant) => ({
        id: participant.id,
        username: participant.username,
        displayName: participant.displayName,
        avatarUrl: participant.avatarUrl,
        isMe: participant.isMe,
        micMuted: participant.micMuted,
        cameraEnabled: null,
        screenSharing: null,
      })),
    };
    const roomTarget: HomeRoomTarget = item.userId
      ? { context: "direct", chatId: item.id, room }
      : { context: "group", groupId: item.id, room };
    return [{
      ...item,
      id: `legacy-room:${item.id}`,
      conversationId: item.id,
      kind: "room",
      activity: "in_room",
      score: scoreHomeNow({ activeRoom: true, pinned: item.pinned }),
      subtitle: `${participants.length} ${item.userId ? "в разговоре" : "в комнате"} · Зайти`,
      participants,
      roomTarget,
    }];
  });

  return [...activeCoreRooms, ...activeLegacyRooms];
}

export async function getHomeActiveRooms(userId: string): Promise<HomeActiveRoomsView> {
  const chats = await listChats(userId);
  return { rooms: await listActiveHomeRoomItems(chats, userId) };
}
