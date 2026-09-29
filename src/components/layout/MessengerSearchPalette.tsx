"use client";

import { ArrowLeft, Search, UsersRound } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { GroupAvatar } from "@/components/chat/GroupAvatar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useDebouncedSearchQuery } from "@/hooks/useDebouncedSearchQuery";
import { trpc } from "@/lib/trpc/client";
import type { ChatListItem } from "@/types/chat";
import type { BetaSearchPerson } from "@/types/search";

import type { NavigationDestinationRenderer } from "./AppNavigationVisual";

type Scope = "all" | "conversations" | "groups" | "people";

const scopes: readonly [Scope, string][] = [
  ["all", "Все"],
  ["conversations", "Диалоги"],
  ["groups", "Группы"],
  ["people", "Люди"],
];

export function MessengerSearchPalette({ chats, renderDestination, onClose }: {
  chats: ChatListItem[];
  renderDestination: NavigationDestinationRenderer;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const { query, setQuery, debouncedQuery } = useDebouncedSearchQuery(220);
  const [scope, setScope] = useState<Scope>("all");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  const people = trpc.search.beta.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length > 0 && (scope === "all" || scope === "people"), staleTime: 10_000 },
  );
  const matchingChats = useMemo(() => chats.filter((chat) => {
    if (chat.parentChatId) return false;
    if (scope === "conversations" && chat.type !== "direct") return false;
    if (scope === "groups" && chat.type !== "group") return false;
    if (scope === "people") return false;
    if (!normalized) return true;
    const title = chat.type === "group"
      ? `${chat.name} ${chat.groupTag ?? ""}`
      : `${chat.otherUser?.displayName ?? ""} ${chat.otherUser?.username ?? ""}`;
    return title.toLocaleLowerCase("ru-RU").includes(normalized);
  }), [chats, normalized, scope]);
  const conversations = matchingChats.filter((chat) => chat.type === "direct");
  const groups = matchingChats.filter((chat) => chat.type === "group");
  const visiblePeople = people.data?.people ?? [];
  const showPeople = normalized.length > 0 && (scope === "all" || scope === "people");

  useLayoutEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const focusInput = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    };
    window.addEventListener("voople:focus-search", focusInput);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("voople:focus-search", focusInput);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  return (
    <>
      <div className="voople-sidebar-search-scrim fixed inset-0" aria-hidden="true" />
      <div ref={rootRef} className="voople-sidebar-search-palette absolute left-0 top-0 w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-[var(--app-radius-md)] border border-[var(--app-border-strong)] bg-[var(--material-overlay-fill)] shadow-[var(--material-overlay-shadow)]" role="dialog" aria-label="Поиск" aria-modal="false">
      <div className="flex h-11 items-center gap-2 border-b border-[var(--app-border)] px-2 focus-within:shadow-[inset_0_0_0_2px_var(--theme-accent)]">
        <Search className="ml-1 h-4 w-4 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
        <input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value.slice(0, 50))} placeholder="Диалоги, группы и люди" aria-label="Поиск диалогов, групп и людей" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--app-muted)]" />
        <button type="button" onClick={() => onClose(true)} aria-label="Закрыть поиск" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"><ArrowLeft className="h-4 w-4" /></button>
      </div>
      <div className="voople-scroll flex gap-1 overflow-x-auto border-b border-[var(--app-border)] p-2" aria-label="Область поиска">
        {scopes.map(([id, label]) => <button key={id} type="button" aria-pressed={scope === id} onClick={() => setScope(id)} className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)] ${scope === id ? "bg-[var(--app-accent-soft)] text-[var(--foreground)]" : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"}`}>{label}</button>)}
      </div>
      <div data-voople-scroll="" className="voople-scroll max-h-[min(60vh,480px)] overflow-y-auto p-2">
        <ChatResults title="Диалоги" chats={conversations} renderDestination={renderDestination} onClose={onClose} />
        <ChatResults title="Группы" chats={groups} renderDestination={renderDestination} onClose={onClose} />
        {showPeople ? <PeopleResults people={visiblePeople} pending={people.isFetching || debouncedQuery !== query.trim()} error={Boolean(people.error)} renderDestination={renderDestination} onClose={onClose} /> : null}
        {normalized && !matchingChats.length && (!showPeople || (!people.isFetching && !people.error && debouncedQuery === query.trim() && !visiblePeople.length)) ? <p className="px-2 py-3 text-sm text-[var(--app-muted)]">Ничего не найдено</p> : null}
        {!normalized && !matchingChats.length ? <p className="px-2 py-3 text-sm text-[var(--app-muted)]">{scope === "people" ? "Введите имя или ник, чтобы найти человека." : scope === "groups" ? "Здесь появятся ваши группы." : scope === "conversations" ? "Здесь появятся ваши диалоги." : "Здесь появятся ваши диалоги и группы."}</p> : null}
        {(scope === "all" || scope === "groups") && normalized ? <div className="mt-2 border-t border-[var(--app-border)] pt-2">{renderDestination({ href: `/search?q=${encodeURIComponent(query.trim())}`, label: "Искать публичные группы", active: false, onNavigate: () => onClose(false), className: "flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]", children: <><UsersRound className="h-4 w-4" aria-hidden="true" />Искать публичные группы</> })}</div> : null}
      </div>
      </div>
    </>
  );
}

function PeopleResults({ people, pending, error, renderDestination, onClose }: {
  people: BetaSearchPerson[];
  pending: boolean;
  error: boolean;
  renderDestination: NavigationDestinationRenderer;
  onClose: (restoreFocus?: boolean) => void;
}) {
  return (
    <section aria-label="Люди" className="mt-2">
      <h2 className="px-2 py-1 text-xs font-medium text-[var(--app-muted)]">Люди</h2>
      {pending ? <p className="px-2 py-3 text-xs text-[var(--app-muted)]" role="status">Ищем людей…</p>
        : error ? <p className="px-2 py-3 text-xs text-[var(--voople-danger)]" role="alert">Не удалось найти людей. Повторите поиск.</p>
          : <ul>{people.map((person) => (
            <li key={person.id}>
              {renderDestination({
                href: `/${person.username}`,
                label: `Профиль ${person.displayName}`,
                active: false,
                onNavigate: () => onClose(false),
                className: "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]",
                children: <>
                  <ProfileAvatar displayName={person.displayName} size="sm" animatedAvatarUrl={person.avatarUrl} />
                  <span className="min-w-0 flex-1 truncate">{person.displayName}</span>
                  <span className="truncate text-xs text-[var(--app-muted)]">@{person.username}</span>
                </>,
              })}
            </li>
          ))}</ul>}
    </section>
  );
}

function ChatResults({ title, chats, renderDestination, onClose }: {
  title: string;
  chats: ChatListItem[];
  renderDestination: NavigationDestinationRenderer;
  onClose: (restoreFocus?: boolean) => void;
}) {
  if (!chats.length) return null;
  return (
    <section aria-label={title} className="mb-2">
      <h2 className="px-2 py-1 text-xs font-medium text-[var(--app-muted)]">{title}</h2>
      <ul>
        {chats.map((chat) => {
          const name = chat.type === "group"
            ? chat.name ?? "Группа"
            : chat.otherUser?.displayName ?? chat.name ?? "Контакт";
          return (
            <li key={chat.id}>
              {renderDestination({
                href: `/messages/${chat.id}`,
                label: chat.type === "group" ? `Открыть группу ${name}` : `Открыть диалог с ${name}`,
                active: false,
                onNavigate: () => onClose(false),
                className: "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]",
                children: <>
                  {chat.type === "group"
                    ? <GroupAvatar name={name} avatarUrl={chat.groupAvatarUrl} icon={chat.groupIcon} accentColor={chat.groupAccentColor} size="sm" />
                    : <ProfileAvatar displayName={name} size="sm" animatedAvatarUrl={chat.otherUser?.avatarUrl} />}
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                </>,
              })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
