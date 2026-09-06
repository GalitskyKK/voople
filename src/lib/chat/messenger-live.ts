import type { HomeNowItem } from "@/types/home";
import type { MessengerGroupLiveState } from "@/types/messenger-live";

export function buildMessengerGroupLiveStates(
  items: HomeNowItem[],
): ReadonlyMap<string, MessengerGroupLiveState> {
  const roomsByGroup = new Map<string, HomeNowItem[]>();
  for (const item of items) {
    if (item.kind !== "room" || item.roomTarget?.context !== "group") continue;
    const groupId = item.roomTarget.groupId;
    roomsByGroup.set(groupId, [...(roomsByGroup.get(groupId) ?? []), item]);
  }

  return new Map([...roomsByGroup].map(([groupId, rooms]) => {
    const participantIds = new Set(
      rooms.flatMap((item) => item.participants?.map((participant) => participant.id) ?? []),
    );
    return [groupId, {
      groupId,
      participantCount: participantIds.size,
      roomCount: rooms.length,
      hasScreenShare: rooms.some((item) => item.roomTarget?.room.hasScreenShare),
    }];
  }));
}
