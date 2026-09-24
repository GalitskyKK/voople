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
  return member.id !== currentUserId && Boolean(member.activeRoom) && currentParticipantIds.has(member.id);
}

export function groupPeopleSections(
  members: ChatGroupMemberView[],
  onlineUserIds: ReadonlySet<string>,
) {
  const byName = (a: ChatGroupMemberView, b: ChatGroupMemberView) =>
    a.displayName.localeCompare(b.displayName, "ru");
  return {
    live: members.filter((member) => Boolean(member.activeRoom)).sort(byName),
    available: members.filter((member) => !member.activeRoom && onlineUserIds.has(member.id)).sort(byName),
    offline: members.filter((member) => !member.activeRoom && !onlineUserIds.has(member.id)).sort(byName),
  };
}
