"use client";

import { useEffect, useRef } from "react";

import {
  readLocalChatAttention,
  recordChatOpened,
  storeChatDraft,
} from "@/lib/social/chat-attention-storage";

export function useLocalChatDraft({
  accountId,
  chatId,
  text,
  editing,
  onRestore,
}: {
  accountId?: string | null;
  chatId: string;
  text: string;
  editing: boolean;
  onRestore: (text: string) => void;
}) {
  const restoredKey = useRef<string | null>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!accountId) return;
    const key = `${accountId}:${chatId}`;
    recordChatOpened(accountId, chatId);
    if (restoredKey.current === key || editing || textRef.current) return;
    restoredKey.current = key;
    const draft = readLocalChatAttention(accountId).find((entry) => entry.chatId === chatId)?.draftText;
    if (draft) onRestore(draft);
  }, [accountId, chatId, editing, onRestore]);

  useEffect(() => {
    if (!accountId || editing) return;
    const timer = window.setTimeout(() => storeChatDraft(accountId, chatId, text), 250);
    return () => window.clearTimeout(timer);
  }, [accountId, chatId, editing, text]);
}
