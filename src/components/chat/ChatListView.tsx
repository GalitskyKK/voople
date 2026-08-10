"use client";

import { MessageCircle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { useChatContactSearch } from "@/hooks/useChatContactSearch";
import { usePublicGroupSearch } from "@/hooks/usePublicGroupSearch";
import type { ChatListItem, PublicGroupSearchHit } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";
import {
  ChatListRow,
  type ChatListDestinationRenderer,
} from "./ChatListRow";
import { ChatContactResults } from "./ChatContactResults";
import { ChatPublicGroupResults } from "./ChatPublicGroupResults";
import type { ChatListFilter, ChatSearchScope } from "./ChatListFilters";
import { ChatListSearchPanel } from "./ChatListSearchPanel";

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
  searchPublicGroups?: (query: string) => Promise<PublicGroupSearchHit[]>;
  openPublicGroup?: (group: PublicGroupSearchHit) => Promise<void>;
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
  searchPublicGroups,
  openPublicGroup,
}: ChatListViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChatListFilter>("all");
  const [searchActive, setSearchActive] = useState(false);
  const [searchScope, setSearchScope] = useState<ChatSearchScope>("all");
  const [openingContactId, setOpeningContactId] = useState<string | null>(null);
  const [openingGroupId, setOpeningGroupId] = useState<string | null>(null);
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
      const typeFilter = searchActive
        ? searchScope === "people"
          ? "direct"
          : searchScope === "groups"
            ? "group"
            : "all"
        : filter;
      if (typeFilter !== "all" && chat.type !== typeFilter) return false;
      if (!normalizedQuery) return true;
      return matchesQuery(chat) || chat.channels.some(matchesQuery);
    });
  }, [chats, filter, query, searchActive, searchScope]);
  const {
    visibleContacts,
    loading: contactsLoading,
    error: contactsError,
    setError: setContactsError,
  } = useChatContactSearch({
    chats,
    enabled: searchActive,
    filter: searchScope === "groups" ? "group" : "all",
    query,
    searchContacts,
  });
  const {
    groups: publicGroups,
    loading: publicGroupsLoading,
    error: publicGroupsError,
    setError: setPublicGroupsError,
  } = usePublicGroupSearch({
    enabled: searchActive && searchScope !== "people",
    query,
    search: searchPublicGroups,
  });

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

  const handleOpenPublicGroup = async (group: PublicGroupSearchHit) => {
    if (!openPublicGroup) return;
    setOpeningGroupId(group.id);
    setPublicGroupsError(null);
    try {
      await openPublicGroup(group);
    } catch (openError) {
      setPublicGroupsError(
        openError instanceof Error
          ? openError.message
          : "Не удалось открыть группу",
      );
    } finally {
      setOpeningGroupId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatListSearchPanel query={query} searchActive={searchActive} filter={filter} searchScope={searchScope} headerAction={headerAction} onQueryChange={setQuery} onSearchActiveChange={setSearchActive} onFilterChange={setFilter} onSearchScopeChange={setSearchScope} />

      <div
        data-voople-scroll=""
        className="voople-messages-layout__list voople-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2 pb-[max(5.5rem,calc(3.625rem+1.25rem+env(safe-area-inset-bottom)))] lg:pb-3"
      >
      {loading ? (
        <div
          className="h-32 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          aria-label="Загружаем чаты"
        />
      ) : error ? (
        <p className="px-3 py-4 text-sm text-red-400">{error}</p>
      ) : <>

      {visibleChats.length ? (
        <div className={searchActive ? "order-2" : undefined}>
          {query.trim() ? (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              Чаты и группы
            </p>
          ) : searchActive ? (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              Недавние чаты
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

      <ChatContactResults
        contacts={visibleContacts}
        loading={contactsLoading}
        openingContactId={openingContactId}
        onOpen={(contact) => void handleOpenContact(contact)}
        renderAvatar={renderContactAvatar}
        renderTitle={renderContactTitle}
      />

      <ChatPublicGroupResults
        groups={publicGroups}
        loading={publicGroupsLoading}
        openingId={openingGroupId}
        onOpen={(group) => void handleOpenPublicGroup(group)}
      />

      {contactsError ? (
        <p className="order-3 px-3 text-xs text-red-400" role="alert">
          {contactsError}
        </p>
      ) : null}
      {publicGroupsError ? (
        <p className="order-3 px-3 text-xs text-red-400" role="alert">
          {publicGroupsError}
        </p>
      ) : null}

      {!visibleChats.length &&
      !visibleContacts.length &&
      !publicGroups.length &&
      !contactsLoading &&
      !publicGroupsLoading ? (
        chats.length || query.trim() ? (
          <p className="order-4 rounded-xl px-3 py-8 text-center text-sm text-[var(--app-muted)]">
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
      </>}
      </div>
    </div>
  );
}
