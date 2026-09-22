"use client";

import { ChevronDown, MessageCircle, MessageSquarePlus, Search, UsersRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { activeMessagesChatId } from "@/lib/layout/messages-path";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";
import type { MessengerGroupLiveState } from "@/types/messenger-live";
import { SavedMessagesShortcut } from "@/components/chat/SavedMessagesShortcut";

import type { NavigationDestinationRenderer } from "./AppNavigationVisual";
import { MessengerDirectRow, MessengerGroupRow } from "./MessengerSidebarRows";

type MessengerSidebarViewProps = {
  pathname: string;
  chats: ChatListItem[];
  loading: boolean;
  error?: string | null;
  onlineUserIds: ReadonlySet<string>;
  liveByGroup?: ReadonlyMap<string, MessengerGroupLiveState>;
  createGroupAction?: ReactNode;
  savedMessagesEnabled?: boolean;
  renderDestination: NavigationDestinationRenderer;
  onRetry: () => void;
};

export function MessengerSidebarView({ pathname, chats, loading, error, onlineUserIds, liveByGroup = new Map(), createGroupAction, savedMessagesEnabled = false, renderDestination, onRetry }: MessengerSidebarViewProps) {
  const activeChatId = activeMessagesChatId(pathname);
  const groups = chats.filter((chat) => chat.type === "group" && !chat.parentChatId);
  const directs = chats.filter((chat) => chat.type === "direct");

  return (
    <nav className="voople-messenger-sidebar flex min-h-0 flex-1 flex-col px-3 pb-3" aria-label="Группы и личные сообщения">
      <div data-voople-scroll="" className="voople-scroll min-h-0 flex-1 overflow-y-auto">
        {loading ? <SidebarSkeleton /> : error ? <SidebarError onRetry={onRetry} /> : (
          <>
            {savedMessagesEnabled ? <SidebarSection id="saved" title="Ваше"><SavedMessagesShortcut active={pathname === "/messages/saved"} variant="sidebar" renderDestination={({ className, children }) => renderDestination({ href: "/messages/saved", label: "Избранное", active: pathname === "/messages/saved", className, children })} /></SidebarSection> : null}
            <SidebarSection id="groups" title="Группы" action={createGroupAction}>
              {groups.length ? groups.map((chat) => <MessengerGroupRow key={chat.id} chat={chat} live={liveByGroup.get(chat.id)} activeChatId={activeChatId} renderDestination={renderDestination} />) : <SidebarEmpty icon={<UsersRound className="h-3.5 w-3.5" />} label="Групп пока нет" />}
            </SidebarSection>
            <SidebarSection
              id="directs"
              title="Личные"
              action={renderDestination({
                href: "/explore?from=messages",
                label: "Новый диалог",
                active: false,
                className: "grid h-6 w-6 place-items-center rounded-md text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
                children: <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />,
              })}
            >
              {directs.length ? directs.map((chat) => <MessengerDirectRow key={chat.id} chat={chat} active={activeChatId === chat.id} onlineUserIds={onlineUserIds} renderDestination={renderDestination} />) : <SidebarEmpty icon={<MessageCircle className="h-3.5 w-3.5" />} label="Диалогов пока нет" />}
            </SidebarSection>
          </>
        )}
      </div>
      <div className="shrink-0 border-t border-[var(--app-border)] pt-2">
        {renderDestination({
          href: "/explore",
          label: "Поиск",
          active: pathname === "/explore",
          className: cn("voople-messenger-sidebar__search flex h-10 items-center gap-2.5 rounded-[var(--app-radius-md)] px-2.5 text-xs font-medium transition-colors", pathname === "/explore" ? "bg-[var(--app-accent-soft)] text-[var(--foreground)]" : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"),
          children: <><Search className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-left">Поиск</span><kbd className="voople-messenger-sidebar__kbd hidden text-[10px] sm:inline">Ctrl K</kbd></>,
        })}
      </div>
    </nav>
  );
}

function SidebarSection({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode; }) {
  const [expanded, setExpanded] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const contentId = `messenger-sidebar-${id}`;
  const storageKey = `voople:messenger-sidebar:${id}:expanded`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored === "true" || stored === "false") setExpanded(stored === "true");
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
      setPreferenceLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      window.localStorage.setItem(storageKey, String(expanded));
    } catch {
      // The control remains functional for the current session.
    }
  }, [expanded, preferenceLoaded, storageKey]);

  return (
    <section className="mb-4">
      <div className="mb-1 flex h-7 items-center gap-1 px-0.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11px] font-medium text-[var(--app-muted)] transition hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 transition-transform motion-reduce:transition-none",
              !expanded && "-rotate-90",
            )}
            aria-hidden="true"
          />
          <span className="truncate">{title}</span>
        </button>
        {action ?? null}
      </div>
      <div id={contentId} className="space-y-0.5" hidden={!expanded}>
        {children}
      </div>
    </section>
  );
}
function SidebarEmpty({ icon, label }: { icon: ReactNode; label: string }) { return <p className="flex items-center gap-2 px-2 py-2 text-[11px] text-[var(--app-muted)]">{icon}{label}</p>; }
function SidebarError({ onRetry }: { onRetry: () => void }) { return <div className="px-2 py-4 text-xs text-[var(--app-muted)]" role="alert"><p>Не удалось загрузить переписки.</p><button type="button" onClick={onRetry} className="mt-2 text-[var(--theme-accent)] hover:underline">Повторить</button></div>; }
function SidebarSkeleton() { return <div className="space-y-2 px-2" aria-label="Загружаем переписки">{[0,1,2].map((item) => <div key={item} className="h-9 animate-pulse rounded-lg bg-[var(--app-surface-soft)]" />)}</div>; }
