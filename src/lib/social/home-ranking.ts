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

export function selectRankedHomeItems<T extends { id: string; score?: number }>(
  items: T[],
  options: { excludeIds?: Iterable<string>; limit: number; minimumScore?: number },
) {
  const excluded = new Set(options.excludeIds ?? []);
  const seen = new Set<string>();
  const minimumScore = options.minimumScore ?? 0;

  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !excluded.has(item.id) && (item.score ?? 0) >= minimumScore)
    .sort((left, right) => (right.item.score ?? 0) - (left.item.score ?? 0) || left.index - right.index)
    .flatMap(({ item }) => {
      if (seen.has(item.id)) return [];
      seen.add(item.id);
      return [item];
    })
    .slice(0, options.limit);
}

export const RECENTLY_OPENED_CHAT_MS = 7 * 24 * 60 * 60_000;

export function selectContinueWithLocalAttention<T extends {
  id: string;
  score?: number;
  subtitle: string | null;
}>(
  candidates: T[],
  entries: Array<{ chatId: string; openedAt: number; draftText: string | null }>,
  now = Date.now(),
) {
  const localByChat = new Map(entries.map((entry) => [entry.chatId, entry]));
  return selectRankedHomeItems(candidates.map((item) => {
    const local = localByChat.get(item.id);
    const hasDraft = Boolean(local?.draftText?.trim());
    const recentlyOpened = Boolean(local && now - local.openedAt <= RECENTLY_OPENED_CHAT_MS);
    return {
      ...item,
      subtitle: hasDraft ? `Черновик: ${local!.draftText!.trim()}` : item.subtitle,
      score: (item.score ?? 0) + (hasDraft ? 60 : 0) + (recentlyOpened ? 5 : 0),
    };
  }), { limit: 4, minimumScore: 1 });
}
