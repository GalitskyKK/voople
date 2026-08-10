"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChatListItem } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

export function useChatContactSearch({
  chats,
  enabled,
  filter,
  query,
  searchContacts,
}: {
  chats: ChatListItem[];
  enabled: boolean;
  filter: "all" | "direct" | "group";
  query: string;
  searchContacts?: (query: string) => Promise<UserSearchHit[]>;
}) {
  const [contacts, setContacts] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !searchContacts || filter === "group") return;
    let active = true;
    const timer = window.setTimeout(
      () => {
        setLoading(true);
        setError(null);
        void searchContacts(query.trim())
          .then((result) => {
            if (active) setContacts(result);
          })
          .catch((searchError: unknown) => {
            if (!active) return;
            setContacts([]);
            setError(
              searchError instanceof Error
                ? searchError.message
                : "Не удалось загрузить контакты",
            );
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      query.trim() ? 220 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [enabled, filter, query, searchContacts]);

  const visibleContacts = useMemo(() => {
    if (!enabled || filter === "group") return [];
    const directUserIds = new Set(
      chats.flatMap((chat) =>
        chat.type === "direct" && chat.otherUser?.id ? [chat.otherUser.id] : [],
      ),
    );
    return contacts.filter((contact) => !directUserIds.has(contact.id));
  }, [chats, contacts, enabled, filter]);

  return {
    visibleContacts,
    loading: !enabled || filter === "group" ? false : loading,
    error: !enabled || filter === "group" ? null : error,
    setError,
  };
}
