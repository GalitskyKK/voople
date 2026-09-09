"use client";

import { MessageCircle, Search, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

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

export function MessengerSidebarView({
  pathname,
  chats,
  loading,
  error,
  onlineUserIds,
  liveByGroup = new Map(),
  createGroupAction,
  savedMessagesEnabled = false,
  renderDestination,
  onRetry,
}: MessengerSidebarViewProps) {
  const activeChatId = activeMessagesChatId(pathname);
  const groups = chats.filter(
    (chat) => chat.type === "group" && !chat.parentChatId,
  );
  const directs = chats.filter((chat) => chat.type === "direct");

  return (
    <nav
      className="voople-messenger-sidebar flex min-h-0 flex-1 flex-col px-2 pb-2"
      aria-label="Группы и личные сообщения"
    >
      <div
        data-voople-scroll=""
        className="voople-scroll min-h-0 flex-1 overflow-y-auto pt-1"
      >
        {loading ? (
          <SidebarSkeleton />
        ) : error ? (
          <SidebarError onRetry={onRetry} />
        ) : (
          <>
            {savedMessagesEnabled ? (
              <SidebarSection title="Ваше">
                <SavedMessagesShortcut
                  active={pathname === "/messages/saved"}
                  variant="sidebar"
                  renderDestination={({ className, children }) => renderDestination({
                    href: "/messages/saved",
                    label: "Избранное",
                    active: pathname === "/messages/saved",
                    className,
                    children,
                  })}
                />
              </SidebarSection>
            ) : null}
            <SidebarSection title="Группы" action={createGroupAction}>
              {groups.length > 0 ? (
                groups.map((chat) => (
                  <MessengerGroupRow
                    key={chat.id}
                    chat={chat}
                    live={liveByGroup.get(chat.id)}
                    activeChatId={activeChatId}
                    renderDestination={renderDestination}
                  />
                ))
              ) : (
                <SidebarEmpty
                  icon={<UsersRound className="h-3.5 w-3.5" />}
                  label="Групп пока нет"
                />
              )}
            </SidebarSection>

            <SidebarSection title="Личные">
              {directs.length > 0 ? (
                directs.map((chat) => (
                  <MessengerDirectRow
                    key={chat.id}
                    chat={chat}
                    active={activeChatId === chat.id}
                    onlineUserIds={onlineUserIds}
                    renderDestination={renderDestination}
                  />
                ))
              ) : (
                <SidebarEmpty
                  icon={<MessageCircle className="h-3.5 w-3.5" />}
                  label="Диалогов пока нет"
                />
              )}
            </SidebarSection>
          </>
        )}
      </div>

      {renderDestination({
        href: "/explore",
        label: "Поиск",
        active: pathname === "/explore",
        className: cn(
          "voople-messenger-sidebar__search flex h-9 shrink-0 items-center gap-2 border-t border-[var(--app-border)] px-2 pt-1 text-xs font-semibold transition-colors",
          pathname === "/explore"
            ? "text-[var(--foreground)]"
            : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
        ),
        children: (
          <>
            <Search className="h-4 w-4" />
            <span>Поиск</span>
          </>
        ),
      })}
    </nav>
  );
}

function SidebarSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-4">
      <div className="mb-1 flex h-6 items-center justify-between px-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
          {title}
        </h2>
        {action ?? null}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function SidebarEmpty({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-2 px-2 py-2 text-[11px] text-[var(--app-muted)]">
      {icon}
      {label}
    </p>
  );
}

function SidebarError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-2 py-4 text-xs text-[var(--app-muted)]" role="alert">
      <p>Не удалось загрузить переписки.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-[var(--theme-accent)] hover:underline"
      >
        Повторить
      </button>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2 px-2" aria-label="Загружаем переписки">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-10 animate-pulse rounded-[4px] bg-[var(--app-surface-soft)]"
        />
      ))}
    </div>
  );
}
