import type { GroupNowParticipant, GroupNowUser } from "@/types/group-now";

export function splitCandidates(participants: GroupNowParticipant[]): GroupNowUser[] {
  return participants.filter((person) => !person.isMe && !person.guest);
}

export function toggleSplitSelection(selected: string[], userId: string): string[] {
  return selected.includes(userId)
    ? selected.filter((id) => id !== userId)
    : [...selected, userId];
}

export function selectedSplitUsers(candidates: GroupNowUser[], selected: string[]): GroupNowUser[] {
  return candidates.filter((person) => selected.includes(person.id));
}
