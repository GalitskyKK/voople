import type { ChatGroupMemberView } from "@/types/chat";
import type { GroupNowView } from "@/types/group-now";

export function currentSessionParticipantIds(
  now: GroupNowView | undefined,
  sessionId: string | null,
): ReadonlySet<string> {
  if (!sessionId) return new Set();
  const room = now?.rooms.find((item) =>
    item.liveSessionId === sessionId && item.state === "active",
  );
  return new Set(room?.participants.filter((person) => !person.guest).map((person) => person.id) ?? []);
}

export function canVoopGroupMember(
  member: ChatGroupMemberView,
  currentUserId: string | null | undefined,
  currentParticipantIds: ReadonlySet<string>,
): boolean {
  return member.id !== currentUserId && currentParticipantIds.has(member.id);
}

export function groupPeopleSections(
  members: ChatGroupMemberView[],
  onlineUserIds: ReadonlySet<string>,
  now?: GroupNowView,
) {
  const byName = (a: ChatGroupMemberView, b: ChatGroupMemberView) =>
    a.displayName.localeCompare(b.displayName, "ru");
  const byId = new Map(members.map((member) => [member.id, member]));
  const liveRooms = (now?.rooms ?? []).flatMap((room) => {
    if (room.state !== "active" && room.state !== "connecting") return [];
    const participants = room.participants
      .filter((person) => !person.guest)
      .map((person) => byId.get(person.id))
      .filter((member): member is ChatGroupMemberView => Boolean(member))
      .sort(byName);
    return participants.length ? [{ id: room.id, name: room.name, members: participants }] : [];
  });
  const liveIds = new Set(liveRooms.flatMap((room) => room.members.map((member) => member.id)));
  const onlineIds = new Set([...onlineUserIds, ...(now?.onlineOutsideRooms.map((person) => person.id) ?? [])]);
  return {
    liveRooms,
    live: liveRooms.flatMap((room) => room.members),
    available: members.filter((member) => !liveIds.has(member.id) && onlineIds.has(member.id)).sort(byName),
    offline: members.filter((member) => !liveIds.has(member.id) && !onlineIds.has(member.id)).sort(byName),
  };
}
