"use client";

import Link from "next/link";
import { ArrowLeft, Hash, UsersRound } from "lucide-react";

import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { ChatListItem } from "@/types/chat";

import { ChatMobileNavigation } from "./ChatMobileNavigation";
import { GroupInviteSheet } from "./GroupInviteSheet";
import { SubchatCreator } from "./SubchatCreator";
import { VoiceRoomButton } from "./voice/VoiceRoomButton";

type ChatWindowHeaderProps = {
  chatId: string;
  chatTitle: string;
  isGroup: boolean;
  isSubchat: boolean;
  parentChatId?: string | null;
  parentName?: string | null;
  memberCount: number;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  topicIcon: string | null;
  viewerRole: "owner" | "admin" | "member";
  other: ChatListItem["otherUser"] | undefined;
  otherOnline: boolean;
};

export function ChatWindowHeader({
  chatId,
  chatTitle,
  isGroup,
  isSubchat,
  parentChatId,
  parentName,
  memberCount,
  topicsEnabled,
  topicsLayout,
  topicIcon,
  viewerRole,
  other,
  otherOnline,
}: ChatWindowHeaderProps) {
  const canManageGroup =
    isGroup && !isSubchat && (viewerRole === "owner" || viewerRole === "admin");

  return (
    <header className="voople-chat-window__header flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-4 lg:pt-3">
      <Link
        href={isSubchat && parentChatId ? `/messages/${parentChatId}` : "/messages"}
        className="shrink-0 rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] lg:hidden"
        aria-label="К списку сообщений"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      {isSubchat ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)">
          {topicIcon ? <span aria-hidden="true">{topicIcon}</span> : <Hash className="h-4 w-4" />}
        </span>
      ) : isGroup ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)">
          <UsersRound className="h-4 w-4" />
        </span>
      ) : other ? (
        <ProfileAvatar
          displayName={other.displayName}
          size="sm"
          isOnline={otherOnline}
          animatedAvatarUrl={other.avatarUrl}
          decorationUrl={other.avatarDecorationUrl}
          ringId={other.avatarRingId}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        {isGroup ? (
          <p className="truncate font-semibold">
            {isSubchat && parentName ? `${parentName} / ${chatTitle}` : chatTitle}
          </p>
        ) : other ? (
          <DisplayNameWithPin hasVooplePlus={other.hasVooplePlus} className="font-semibold">
            {other.displayName}
          </DisplayNameWithPin>
        ) : (
          <p className="truncate font-semibold">Чат</p>
        )}
        {isGroup ? (
          <p className="text-xs text-[var(--app-muted)]">
            {isSubchat ? "Тема · " : ""}
            {memberCount} участников
          </p>
        ) : other ? (
          <p className="text-xs text-[var(--app-muted)]">
            {otherOnline ? (
              <span className="text-emerald-500">в сети</span>
            ) : (
              <Link href={`/${other.username}`} className="voople-link hover:underline">
                @{other.username}
              </Link>
            )}
          </p>
        ) : null}
      </div>
      <VoiceRoomButton
        chatId={chatId}
        chatName={chatTitle}
        chatType={isGroup ? "group" : "direct"}
      />
      {canManageGroup && topicsEnabled ? <SubchatCreator parentChatId={chatId} /> : null}
      {isGroup && !isSubchat ? (
        <GroupInviteSheet
          chatId={chatId}
          chatName={chatTitle}
          canManage={canManageGroup}
          topicsEnabled={topicsEnabled}
          topicsLayout={topicsLayout}
        />
      ) : null}
      <ChatMobileNavigation />
    </header>
  );
}
