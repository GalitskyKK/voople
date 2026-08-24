"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  CHAT_ATTENTION_CHANGE_EVENT,
  parseLocalChatAttentionSnapshot,
  readLocalChatAttentionSnapshot,
} from "@/lib/social/chat-attention-storage";

const EMPTY_SNAPSHOT = "[]";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHAT_ATTENTION_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHAT_ATTENTION_CHANGE_EVENT, onStoreChange);
  };
}

export function useLocalChatAttention(accountId?: string | null) {
  const getSnapshot = useCallback(
    () => accountId ? readLocalChatAttentionSnapshot(accountId) : EMPTY_SNAPSHOT,
    [accountId],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
  return useMemo(() => parseLocalChatAttentionSnapshot(snapshot), [snapshot]);
}
