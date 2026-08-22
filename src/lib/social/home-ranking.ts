export function scoreHomeNow(input: {
  activeRoom?: boolean;
  pinned?: boolean;
  playing?: boolean;
  listening?: boolean;
  online?: boolean;
  lastInteractionAt?: string | null;
  relationshipScore?: number;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const ageHours = input.lastInteractionAt
    ? (nowMs - Date.parse(input.lastInteractionAt)) / 3_600_000
    : Number.POSITIVE_INFINITY;
  return (input.activeRoom ? 100 : 0)
    + (input.pinned ? 50 : 0)
    + (input.playing ? 35 : input.listening ? 20 : input.online ? 10 : 0)
    + (ageHours <= 24 ? 30 : ageHours <= 72 ? 20 : 0)
    + ((input.relationshipScore ?? 0) >= 70 ? 20 : 0);
}

export function scoreHomeContinue(input: {
  mentionOrReply?: boolean;
  unreadCount?: number;
  hasDraft?: boolean;
  lastInteractionAt?: string | null;
  reciprocal?: boolean;
  recentlyOpened?: boolean;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const ageHours = input.lastInteractionAt
    ? (nowMs - Date.parse(input.lastInteractionAt)) / 3_600_000
    : Number.POSITIVE_INFINITY;
  return (input.mentionOrReply ? 100 : 0)
    + ((input.unreadCount ?? 0) > 0 ? 70 : 0)
    + (input.hasDraft ? 60 : 0)
    + (ageHours <= 24 ? 40 : 0)
    + (input.reciprocal ? 30 : 0)
    + (input.recentlyOpened ? 5 : 0);
}
