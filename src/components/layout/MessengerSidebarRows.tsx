import { ChevronRight } from "lucide-react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { GroupAvatar } from "@/components/chat/GroupAvatar";
import { ChatUnreadBadge } from "@/components/chat/ChatUnreadBadge";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/types/chat";
import type { MessengerGroupLiveState } from "@/types/messenger-live";

export function MessengerGroupRow({ chat, live, activeChatId, renderDestination }: { chat: ChatListItem; live?: MessengerGroupLiveState; activeChatId: string | null; renderDestination: NavigationDestinationRenderer; }) {
  const title = chat.name || "Группа";
  const active = activeChatId === chat.id || chat.channels.some((section) => section.id === activeChatId);
  return renderDestination({
    href: `/messages/${chat.id}`,
    label: title,
    active,
    className: sidebarRowClassName(active),
    children: (
      <>
        <GroupAvatar name={title} avatarUrl={chat.groupAvatarUrl} icon={chat.groupIcon} accentColor={chat.groupAccentColor} size="sm" shape="square" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
        <ChatUnreadBadge count={chat.unreadCount} />
        {active ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--voople-ice)]" aria-hidden="true" /> : live ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" /> : null}
      </>
    ),
  });
}

export function MessengerDirectRow({ chat, active, onlineUserIds, renderDestination }: { chat: ChatListItem; active: boolean; onlineUserIds: ReadonlySet<string>; renderDestination: NavigationDestinationRenderer; }) {
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
        <ProfileAvatar displayName={title} size="sm" shape="square" animatedAvatarUrl={other?.avatarUrl} decorationUrl={other?.avatarDecorationUrl} ringId={other?.avatarRingId} isOnline={online} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{title}</span>
        <ChatUnreadBadge count={chat.unreadCount} />
      </>
    ),
  });
}

function sidebarRowClassName(active: boolean) {
  return cn(
    "voople-messenger-sidebar__row group flex min-h-11 w-full items-center gap-2.5 px-2.5 py-1.5 text-left",
    active ? "voople-messenger-sidebar__row--active text-[var(--foreground)]" : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
  );
}
