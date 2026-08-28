"use client";

import Link from "next/link";
import { ArrowLeft, Hash } from "lucide-react";

import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { ChatListItem } from "@/types/chat";

import { ChatMobileNavigation } from "./ChatMobileNavigation";
import { ChatPeerPresence } from "./ChatPeerPresence";
import { ChatWindowHeaderVisual } from "./ChatWindowHeaderVisual";
import { GroupInfoDrawer } from "./GroupInfoDrawer";
import { SectionAccessSheet } from "./SectionAccessSheet";
import { VoiceRoomButton } from "./voice/VoiceRoomButton";

type ChatWindowHeaderProps = {
  chatId: string;
  chatTitle: string;
  isGroup: boolean;
  isSubchat: boolean;
  parentChatId?: string | null;
  parentName?: string | null;
  memberCount: number;
  topicIcon: string | null;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
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
  topicIcon,
  groupIcon,
  groupAvatarUrl,
  groupBannerUrl,
  groupAccentColor,
  groupTag,
  viewerRole,
  other,
  otherOnline,
}: ChatWindowHeaderProps) {
  const canManageGroup =
    isGroup && !isSubchat && (viewerRole === "owner" || viewerRole === "admin");

  return (
    <ChatWindowHeaderVisual>
      <Link
        href={isSubchat && parentChatId ? `/messages/${parentChatId}` : "/messages"}
        className="shrink-0 rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] lg:hidden"
        aria-label="К списку сообщений"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      {isGroup && !isSubchat ? (
        <GroupInfoDrawer
          chatId={chatId}
          chatName={chatTitle}
          memberCount={memberCount}
          groupIcon={groupIcon}
          groupAvatarUrl={groupAvatarUrl}
          groupBannerUrl={groupBannerUrl}
          groupAccentColor={groupAccentColor}
          groupTag={groupTag}
          canManage={canManageGroup}
        />
      ) : isSubchat ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-(--theme-accent)">
          {topicIcon ? <span aria-hidden="true">{topicIcon}</span> : <Hash className="h-4 w-4" />}
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
      {isGroup && !isSubchat ? null : <div className="min-w-0 flex-1">
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
            {isSubchat ? "Раздел · " : ""}
            {memberCount} участников
          </p>
        ) : other ? (
          <p className="text-xs text-[var(--app-muted)]">
            <Link href={`/${other.username}`} className="voople-link hover:underline">
              <ChatPeerPresence
                isOnline={otherOnline}
                lastSeenAt={other.lastSeenAt}
                username={other.username}
              />
            </Link>
          </p>
        ) : null}
      </div>}
      {isSubchat && parentChatId && viewerRole !== "member" ? (
        <SectionAccessSheet chatId={chatId} parentChatId={parentChatId} />
      ) : null}
      <VoiceRoomButton
        chatId={chatId}
        chatName={chatTitle}
        chatType={isGroup ? "group" : "direct"}
      />
      <ChatMobileNavigation />
    </ChatWindowHeaderVisual>
  );
}
