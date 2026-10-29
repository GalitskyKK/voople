"use client";

import { MessageCircle, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceSlot } from "@/hooks/useWorkspaceSlot";
import { DirectConversationInfo } from "@/components/chat/DirectConversationInfo";
import { GroupAvatar } from "@/components/chat/GroupAvatar";
import { ChatUnreadBadge } from "@/components/chat/ChatUnreadBadge";
import { DockMagnifier } from "@/components/ui/DockMagnifier";
import { Skeleton } from "@/components/ui/Skeleton";
import { activeMessagesChatId, isSavedMessagesPath } from "@/lib/layout/messages-path";
import { SavedMessagesShortcut } from "@/components/chat/SavedMessagesShortcut";
import type { ChatListItem } from "@/types/chat";
import type { MessengerGroupLiveState } from "@/types/messenger-live";
import type { NavigationDestinationRenderer } from "./AppNavigationVisual";
import { SidebarItemTooltip } from "./SidebarItemTooltip";
import { MessengerDirectRow, MessengerGroupRow } from "./MessengerSidebarRows";

type RailMode = "groups" | "directs";

export function MessengerRailView({ pathname, chats, loading, error, onlineUserIds, liveByGroup, onSearch, onNewDirect, onRetry, renderDestination, expanded = false, savedMessagesEnabled = false, createGroupAction }: {
  pathname: string; chats: ChatListItem[]; loading: boolean; error?: string | null;
  onlineUserIds: ReadonlySet<string>; liveByGroup: ReadonlyMap<string, MessengerGroupLiveState>;
  onSearch: () => void; onNewDirect: () => void; onRetry: () => void; renderDestination: NavigationDestinationRenderer;
  expanded?: boolean; savedMessagesEnabled?: boolean;
  createGroupAction?: ReactNode;
}) {
  const listSlot = useWorkspaceSlot("direct-list"), createSlot = useWorkspaceSlot("direct-create"), infoSlot = useWorkspaceSlot("direct-info");
  const activeChatId = activeMessagesChatId(pathname);
  const groups = chats.filter((chat) => chat.type === "group" && !chat.parentChatId);
  const directs = chats.filter((chat) => chat.type === "direct");
  const activeChat = chats.find((chat) => chat.id === activeChatId || chat.channels.some((channel) => channel.id === activeChatId));
  const mode: RailMode = activeChat?.type === "direct" || isSavedMessagesPath(pathname) || pathname.split(/[?#]/, 1)[0] === "/messages" ? "directs" : "groups";
  const renderChat = (chat: ChatListItem) => {
    if (expanded) return <div key={chat.id} className="voople-orbit-rail__item"><MessengerGroupRow chat={chat} live={liveByGroup.get(chat.id)} activeChatId={activeChatId} renderDestination={renderDestination} /></div>;
    const title = chat.name || "Группа";
    const active = chat.id === activeChatId || chat.channels.some((channel) => channel.id === activeChatId);
    const live = liveByGroup.get(chat.id);
    return <div key={chat.id} data-dock-item="" className="voople-orbit-rail__item">
      <SidebarItemTooltip label={`${title}${live ? ` · ${live.participantCount} в голосе` : ""}`} enabled>
        {renderDestination({ href: `/messages/${chat.id}`, label: title, active,
          className: "voople-orbit-rail__link", children: <>
            <span data-dock-icon="" className="voople-orbit-rail__icon">
              <GroupAvatar name={title} avatarUrl={chat.groupAvatarUrl} icon={chat.groupIcon} accentColor={chat.groupAccentColor} size="md" shape="square" />
              {live ? <span className="voople-orbit-rail__live" aria-label={`${live.participantCount} в голосе`} /> : null}
              {chat.unreadCount > 0 ? <span className="voople-orbit-rail__unread"><ChatUnreadBadge count={chat.unreadCount} /></span> : null}
            </span>
          </> })}
      </SidebarItemTooltip>
    </div>;
  };
  const passive = loading ? <div role="status" aria-label="Загружаем переписки">{[0, 1, 2].map((id) => <Skeleton key={id} shape="avatar" className="mx-auto my-3 h-10 w-10" />)}</div>
    : error ? <button type="button" className="voople-orbit-rail__retry" onClick={onRetry} aria-label="Не удалось загрузить переписки. Повторить">Повторить</button> : null;
  const createDirect = <button type="button" className="voople-orbit-rail__new-direct" aria-label="Новый диалог" onClick={onNewDirect}><Plus className="h-5 w-5" aria-hidden="true" /></button>;
  const directList = <RailSection label="Личные" kind="directs" hidden={mode !== "directs"} inline={Boolean(listSlot)} action={createDirect}>
    {savedMessagesEnabled ? <SavedMessagesShortcut active={isSavedMessagesPath(pathname)} variant="sidebar" renderDestination={({ className, children }) => renderDestination({ href: "/messages/saved", label: "Избранное", active: isSavedMessagesPath(pathname), className, children })} /> : null}
    {passive ?? directs.map(chat => <div key={chat.id} className="voople-orbit-rail__item"><MessengerDirectRow chat={chat} active={chat.id === activeChatId} onlineUserIds={onlineUserIds} renderDestination={renderDestination} /></div>)}
  </RailSection>;
  return <nav className="voople-orbit-rail" data-mode={mode} aria-label="Группы и личные сообщения">
    <div className="voople-orbit-rail__search"><SidebarItemTooltip label="Поиск · Ctrl K" enabled><button type="button" className="voople-orbit-rail__link" aria-label="Поиск" onClick={onSearch}><Search className="h-5 w-5" /></button></SidebarItemTooltip></div>
    <div className="voople-orbit-rail__modes" aria-label="Тип переписок">
      <SidebarItemTooltip label="Личные сообщения" enabled={!expanded}>{renderDestination({ href: "/messages", label: "Личные сообщения", active: mode === "directs", className: "voople-orbit-rail__mode", children: <><MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="voople-orbit-rail__mode-label">Личные</span><ChatUnreadBadge count={directs.reduce((sum, item) => sum + item.unreadCount, 0)} /></> })}</SidebarItemTooltip>
    </div>
    <div className="voople-orbit-rail__sections">
        {listSlot ? createPortal(directList, listSlot) : directList}
        {createSlot ? createPortal(<>{createDirect}{activeChat?.type === "direct" ? <span hidden data-direct-peer-present="" /> : null}</>, createSlot) : null}
        {infoSlot && activeChat?.type === "direct" && activeChat.otherUser ? createPortal(<DirectConversationInfo peer={activeChat.otherUser} online={onlineUserIds.has(activeChat.otherUser.id)} />, infoSlot) : null}
        <RailSection label="Группы" kind="groups" hidden={false} action={createGroupAction ?? <SidebarItemTooltip label="Создать или найти группу" enabled>{renderDestination({ href: "/messages", label: "Создать или найти группу", active: false, className: "voople-orbit-rail__link", children: <Plus className="h-5 w-5" /> })}</SidebarItemTooltip>}>
          {passive ?? groups.map(renderChat)}
        </RailSection>
      </div>
  </nav>;
}

function RailSection({ label, kind, hidden, action, children, inline = false }: { label: string; kind: RailMode; hidden: boolean; action: ReactNode; children: ReactNode; inline?: boolean }) {
  return <section aria-label={label} hidden={hidden} data-rail-section={kind} data-inline={inline} className="voople-orbit-rail__section">
    {kind === "directs" && !inline ? <header className="voople-orbit-rail__panel-header"><strong>Личные сообщения</strong>{action}</header> : null}
    <DockMagnifier className="voople-orbit-rail__scroll voople-scroll">{children}</DockMagnifier>
    {kind === "groups" ? <div className="voople-orbit-rail__section-action">{action}</div> : null}
  </section>;
}
