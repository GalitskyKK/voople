import { MonitorUp, Radio } from "lucide-react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { GroupAvatar } from "@/components/chat/GroupAvatar";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";
import type { MessengerGroupLiveState } from "@/types/messenger-live";

export function MessengerGroupRow({
  chat,
  live,
  activeChatId,
  renderDestination,
}: {
  chat: ChatListItem;
  live?: MessengerGroupLiveState;
  activeChatId: string | null;
  renderDestination: NavigationDestinationRenderer;
}) {
  const title = chat.name || "Группа";
  const active =
    activeChatId === chat.id ||
    chat.channels.some((section) => section.id === activeChatId);

  return renderDestination({
    href: `/messages/${chat.id}`,
    label: title,
    active,
    className: sidebarRowClassName(active),
    children: (
      <>
        <GroupAvatar
          name={title}
          avatarUrl={chat.groupAvatarUrl}
          icon={chat.groupIcon}
          accentColor={chat.groupAccentColor}
          size="sm"
          shape="square"
        />
        <SidebarRowCopy
          title={title}
          subtitle={
            live
              ? `${live.participantCount} в голосе`
              : chat.lastMessage?.preview || `${chat.memberCount} участников`
          }
          online={Boolean(live)}
        />
        {live ? (
          <span className="flex min-w-6 shrink-0 flex-col items-center justify-center text-emerald-400" aria-label={`${live.roomCount} ${live.roomCount === 1 ? "комната" : "комнаты"}${live.hasScreenShare ? " · идёт демонстрация экрана" : ""}`}>
            {live.hasScreenShare ? <MonitorUp className="h-3.5 w-3.5" aria-hidden="true" /> : <Radio className="h-3.5 w-3.5" aria-hidden="true" />}
            {live.roomCount > 1 ? <span className="font-mono text-[9px] leading-none" aria-hidden="true">{live.roomCount}</span> : null}
          </span>
        ) : null}
      </>
    ),
  });
}

export function MessengerDirectRow({
  chat,
  active,
  onlineUserIds,
  renderDestination,
}: {
  chat: ChatListItem;
  active: boolean;
  onlineUserIds: ReadonlySet<string>;
  renderDestination: NavigationDestinationRenderer;
}) {
  const other = chat.otherUser;
  const title = other?.displayName ?? "Чат";
  const online = Boolean(other?.id && onlineUserIds.has(other.id));

  return renderDestination({
    href: `/messages/${chat.id}`,
    label: title,
    active,
    className: sidebarRowClassName(active),
    children: (
      <>
        <ProfileAvatar
          displayName={title}
          size="sm"
          shape="square"
          animatedAvatarUrl={other?.avatarUrl}
          decorationUrl={other?.avatarDecorationUrl}
          ringId={other?.avatarRingId}
          isOnline={online}
        />
        <SidebarRowCopy
          title={title}
          subtitle={
            online
              ? "В сети"
              : chat.lastMessage?.preview || `@${other?.username ?? "user"}`
          }
          online={online}
        />
      </>
    ),
  });
}

function SidebarRowCopy({
  title,
  subtitle,
  online = false,
}: {
  title: string;
  subtitle: string;
  online?: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-xs font-semibold">{title}</span>
      <span
        className={cn(
          "block truncate text-[10px]",
          online ? "text-emerald-400" : "text-[var(--app-muted)]",
        )}
      >
        {subtitle}
      </span>
    </span>
  );
}

function sidebarRowClassName(active: boolean) {
  return cn(
    "voople-messenger-sidebar__row group flex min-h-11 w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left transition-colors",
    active
      ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--foreground)]"
      : "border-transparent text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
  );
}
