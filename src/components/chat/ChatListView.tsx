"use client";

import { Loader2, MessageCircle, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { useChatContactSearch } from "@/hooks/useChatContactSearch";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";
import {
  ChatListRow,
  type ChatListDestinationRenderer,
} from "./ChatListRow";

export type { ChatListDestinationRenderer } from "./ChatListRow";

type ChatListViewProps = {
  chats: ChatListItem[];
  activeChatId?: string | null;
  loading?: boolean;
  error?: string | null;
  headerAction?: ReactNode;
  emptyAction?: ReactNode;
  renderDestination: ChatListDestinationRenderer;
  renderAvatar: (chat: ChatListItem, title: string) => ReactNode;
  renderTitle?: (chat: ChatListItem, title: string) => ReactNode;
  searchContacts?: (query: string) => Promise<UserSearchHit[]>;
  openContact?: (user: UserSearchHit) => Promise<void>;
  renderContactAvatar?: (user: UserSearchHit) => ReactNode;
  renderContactTitle?: (user: UserSearchHit) => ReactNode;
};

export function ChatListView({
  chats,
  activeChatId = null,
  loading = false,
  error,
  headerAction,
  emptyAction,
  renderDestination,
  renderAvatar,
  renderTitle,
  searchContacts,
  openContact,
  renderContactAvatar,
  renderContactTitle,
}: ChatListViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "direct" | "group">("all");
  const [openingContactId, setOpeningContactId] = useState<string | null>(null);
  const visibleChats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    const matchesQuery = (chat: ChatListItem) =>
      [
        chat.name,
        chat.otherUser?.displayName,
        chat.otherUser?.username,
        chat.lastMessage?.text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU")
        .includes(normalizedQuery);
    return chats.filter((chat) => {
      if (filter !== "all" && chat.type !== filter) return false;
      if (!normalizedQuery) return true;
      return matchesQuery(chat) || chat.channels.some(matchesQuery);
    });
  }, [chats, filter, query]);
  const {
    visibleContacts,
    loading: contactsLoading,
    error: contactsError,
    setError: setContactsError,
  } = useChatContactSearch({ chats, filter, query, searchContacts });

  const handleOpenContact = async (contact: UserSearchHit) => {
    if (!openContact) return;
    setOpeningContactId(contact.id);
    setContactsError(null);
    try {
      await openContact(contact);
    } catch (openError) {
      setContactsError(
        openError instanceof Error ? openError.message : "Не удалось открыть чат",
      );
    } finally {
      setOpeningContactId(null);
    }
  };

  if (loading) {
    return (
      <div
        className="h-32 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
        aria-label="Загружаем чаты"
      />
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Чаты, группы и контакты"
            aria-label="Найти чат, группу или контакт"
            className="voople-input h-10 w-full pl-9 text-sm"
          />
        </label>
        {headerAction}
      </div>

      <div
        className="grid grid-cols-3 rounded-xl bg-[var(--app-surface-soft)] p-1"
        aria-label="Фильтр чатов"
      >
        {([
          ["all", "Все"],
          ["direct", "Личные"],
          ["group", "Группы"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-medium transition",
              filter === id
                ? "bg-[var(--app-surface)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
                : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleChats.length ? (
        <div>
          {query.trim() ? (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              Чаты и группы
            </p>
          ) : null}
          <ul className="voople-chat-list space-y-0.5">
          {visibleChats.map((chat) => (
            <ChatListRow
              key={chat.id}
              chat={chat}
              activeChatId={activeChatId}
              renderDestination={renderDestination}
              renderAvatar={renderAvatar}
              renderTitle={renderTitle}
            />
          ))}
          </ul>
        </div>
      ) : null}

      {contactsLoading ? (
        <div className="flex items-center justify-center gap-2 px-3 py-5 text-xs text-[var(--app-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Ищем контакты
        </div>
      ) : visibleContacts.length ? (
        <div>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
            Контакты
          </p>
          <ul className="space-y-0.5">
            {visibleContacts.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--app-surface-soft)] disabled:opacity-60"
                  disabled={openingContactId !== null}
                  onClick={() => void handleOpenContact(contact)}
                >
                  {renderContactAvatar?.(contact)}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {renderContactTitle?.(contact) ?? contact.displayName}
                    </span>
                    <span className="block truncate text-xs text-[var(--app-muted)]">
                      @{contact.username}
                    </span>
                  </span>
                  {openingContactId === contact.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--app-muted)]" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {contactsError ? (
        <p className="px-3 text-xs text-red-400" role="alert">
          {contactsError}
        </p>
      ) : null}

      {!visibleChats.length && !visibleContacts.length && !contactsLoading ? (
        chats.length || query.trim() ? (
          <p className="rounded-xl px-3 py-8 text-center text-sm text-[var(--app-muted)]">
            Ничего не найдено
          </p>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] px-4 py-6 text-center">
            <MessageCircle className="mx-auto h-6 w-6 text-[var(--app-muted)]" />
            <p className="mt-3 text-sm font-medium">Здесь появятся ваши чаты</p>
            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
              Найдите контакт или создайте группу.
            </p>
            {emptyAction}
          </div>
        )
      ) : null}
    </div>
  );
}
