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

  const row = renderDestination({
    href: `/messages/${chat.id}`,
    label: title,
    active,
    className: cn(sidebarRowClassName(active), live && "pr-10"),
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
      </>
    ),
  });

  if (!live) return row;

  return (
    <div className="relative">
      {row}
      {renderDestination({
        href: `/messages/${chat.id}?surface=now`,
        label: `Сейчас в группе ${title}: ${live.participantCount} в голосе`,
        active: false,
        className: "absolute right-1 top-1/2 flex min-h-8 min-w-8 -translate-y-1/2 flex-col items-center justify-center rounded-lg text-emerald-400 transition hover:bg-emerald-500/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-400",
        children: (
          <>
            {live.hasScreenShare ? <MonitorUp className="h-3.5 w-3.5" aria-hidden="true" /> : <Radio className="h-3.5 w-3.5" aria-hidden="true" />}
            {live.roomCount > 1 ? <span className="font-mono text-[9px] leading-none" aria-hidden="true">{live.roomCount}</span> : null}
          </>
        ),
      })}
    </div>
  );
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
