"use client";

import { useState } from "react";
import { ChatContactResults } from "@/components/chat/ChatContactResults";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";
import type { UserSearchHit } from "@/types/search";

/** Uses the same contacts and openDirect contract as the ordinary inbox. */
export function MessengerDirectSearch({ query, pendingQuery, onNavigate, onClose }: {
  query: string;
  pendingQuery: boolean;
  onNavigate: (href: string) => void;
  onClose: () => void;
}) {
  const contacts = trpc.chat.contacts.useQuery({ q: query }, { staleTime: 10_000 });
  const openDirect = trpc.chat.openDirect.useMutation();
  const utils = trpc.useUtils();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = async (contact: UserSearchHit) => {
    if (openingId) return;
    setOpeningId(contact.id);
    setError(null);
    try {
      const result = await openDirect.mutateAsync({ username: contact.username });
      void utils.chat.list.invalidate();
      onNavigate(`/messages/${result.chatId}`);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось открыть диалог");
    } finally {
      setOpeningId(null);
    }
  };
  const loading = contacts.isFetching || pendingQuery;
  return <>
    {error ? <p role="alert" className="px-3 py-2 text-sm text-[var(--voople-danger)]">{error}</p> : null}
    {contacts.error ? <div role="alert" className="px-3 py-2 text-sm"><p>Не удалось найти собеседника.</p><button type="button" className="mt-2 underline" onClick={() => void contacts.refetch()}>Повторить</button></div>
      : <ChatContactResults contacts={contacts.data ?? []} loading={loading} openingContactId={openingId} onOpen={(contact) => void open(contact)} renderAvatar={(contact) => <ProfileAvatar displayName={contact.displayName} animatedAvatarUrl={contact.avatarUrl} size="sm" />} />}
    {!loading && !contacts.error && !contacts.data?.length ? <p className="px-3 py-3 text-sm text-[var(--app-muted)]">{query ? "Никого не найдено" : "Введите имя или ник"}</p> : null}
  </>;
}
