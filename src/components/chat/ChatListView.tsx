"use client";

import { MessageCircle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { useChatContactSearch } from "@/hooks/useChatContactSearch";
import type { ChatListItem } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";
import {
  ChatListRow,
  type ChatListDestinationRenderer,
} from "./ChatListRow";
import { ChatContactResults } from "./ChatContactResults";
import type { ChatSearchScope } from "./ChatListFilters";
import { ChatListSearchPanel } from "./ChatListSearchPanel";
import { ChatListSection } from "./ChatListSection";
import {
  SavedMessagesShortcut,
  type SavedMessagesDestinationRenderer,
} from "./SavedMessagesShortcut";

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
  renderGlobalSearchAction?: (query: string) => ReactNode;
  savedMessagesActive?: boolean;
  renderSavedMessagesDestination?: SavedMessagesDestinationRenderer;
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
  renderGlobalSearchAction,
  savedMessagesActive = false,
  renderSavedMessagesDestination,
}: ChatListViewProps) {
  const [query, setQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [searchScope, setSearchScope] = useState<ChatSearchScope>("all");
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
      const typeFilter = searchActive
        ? searchScope === "people"
          ? "direct"
          : searchScope === "groups"
            ? "group"
            : "all"
        : "all";
      if (typeFilter !== "all" && chat.type !== typeFilter) return false;
      if (!normalizedQuery) return true;
      return matchesQuery(chat) || chat.channels.some(matchesQuery);
    });
  }, [chats, query, searchActive, searchScope]);
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
  const groups = visibleChats.filter((chat) => chat.type === "group");
  const directs = visibleChats.filter((chat) => chat.type === "direct");
  const showSavedMessages = Boolean(
    renderSavedMessagesDestination && !searchActive && !query.trim(),
  );
  const renderRows = (items: ChatListItem[]) =>
    items.map((chat) => (
      <ChatListRow
        key={chat.id}
        chat={chat}
        activeChatId={activeChatId}
        renderDestination={renderDestination}
        renderAvatar={renderAvatar}
        renderTitle={renderTitle}
      />
    ));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatListSearchPanel
        query={query}
        searchActive={searchActive}
        searchScope={searchScope}
        headerAction={headerAction}
        onQueryChange={setQuery}
        onSearchActiveChange={setSearchActive}
        onSearchScopeChange={setSearchScope}
      />

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
        ) : (
          <>
            {showSavedMessages && renderSavedMessagesDestination ? (
              <ChatListSection title="Ваше">
                <li>
                  <SavedMessagesShortcut
                    active={savedMessagesActive}
                    variant="inbox"
                    renderDestination={renderSavedMessagesDestination}
                  />
                </li>
              </ChatListSection>
            ) : null}
            {visibleChats.length && !searchActive && !query.trim() ? (
              <div className="space-y-4">
                {groups.length ? (
                  <ChatListSection title="Группы">
                    {renderRows(groups)}
                  </ChatListSection>
                ) : null}
                {directs.length ? (
                  <ChatListSection title="Личные сообщения">
                    {renderRows(directs)}
                  </ChatListSection>
                ) : null}
              </div>
            ) : visibleChats.length ? (
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
                  {renderRows(visibleChats)}
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

            {contactsError ? (
              <p className="order-3 px-3 text-xs text-red-400" role="alert">
                {contactsError}
              </p>
            ) : null}
            {!showSavedMessages &&
            !visibleChats.length &&
            !visibleContacts.length &&
            !contactsLoading ? (
              chats.length || query.trim() ? (
                <div className="order-4 rounded-xl px-3 py-8 text-center text-sm text-[var(--app-muted)]">
                  <p>Ничего не найдено</p>
                  {query.trim()
                    ? renderGlobalSearchAction?.(query.trim())
                    : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--app-border)] px-4 py-6 text-center">
                  <MessageCircle className="mx-auto h-6 w-6 text-[var(--app-muted)]" />
                  <p className="mt-3 text-sm font-medium">
                    Здесь появятся ваши чаты
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                    Найдите контакт или создайте группу.
                  </p>
                  {emptyAction}
                </div>
              )
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
