const STORAGE_PREFIX = "voople:chat-attention:v1:";
export const CHAT_ATTENTION_CHANGE_EVENT = "voople:chat-attention-change";
const MAX_ENTRIES = 50;

export type LocalChatAttention = {
  chatId: string;
  openedAt: number;
  draftText: string | null;
  draftUpdatedAt: number | null;
};

function storageKey(accountId: string) {
  return `${STORAGE_PREFIX}${accountId}`;
}

export function readLocalChatAttentionSnapshot(accountId: string) {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(storageKey(accountId)) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseLocalChatAttentionSnapshot(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): LocalChatAttention[] => {
      if (!value || typeof value !== "object") return [];
      const entry = value as Partial<LocalChatAttention>;
      if (typeof entry.chatId !== "string" || typeof entry.openedAt !== "number") return [];
      return [{
        chatId: entry.chatId,
        openedAt: entry.openedAt,
        draftText: typeof entry.draftText === "string" ? entry.draftText : null,
        draftUpdatedAt: typeof entry.draftUpdatedAt === "number" ? entry.draftUpdatedAt : null,
      }];
    }).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function readLocalChatAttention(accountId: string) {
  return parseLocalChatAttentionSnapshot(readLocalChatAttentionSnapshot(accountId));
}

function writeEntries(accountId: string, entries: LocalChatAttention[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(accountId), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event(CHAT_ATTENTION_CHANGE_EVENT));
  } catch {
    // Storage can be unavailable in private/restricted WebViews; chat remains usable.
  }
}

export function recordChatOpened(accountId: string, chatId: string, now = Date.now()) {
  const entries = readLocalChatAttention(accountId);
  const current = entries.find((entry) => entry.chatId === chatId);
  writeEntries(accountId, [
    { chatId, openedAt: now, draftText: current?.draftText ?? null, draftUpdatedAt: current?.draftUpdatedAt ?? null },
    ...entries.filter((entry) => entry.chatId !== chatId),
  ]);
}

export function storeChatDraft(accountId: string, chatId: string, text: string, now = Date.now()) {
  const entries = readLocalChatAttention(accountId);
  const current = entries.find((entry) => entry.chatId === chatId);
  const clean = text.trim();
  writeEntries(accountId, [
    {
      chatId,
      openedAt: current?.openedAt ?? now,
      draftText: clean ? text.slice(0, 1_000) : null,
      draftUpdatedAt: clean ? now : null,
    },
    ...entries.filter((entry) => entry.chatId !== chatId),
  ]);
}
