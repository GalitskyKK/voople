import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import type { ChatListItem } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";

export function ChatConversationStart({
  chatTitle,
  isGroup,
  isSubchat,
  parentName,
  memberCount,
  topicIcon,
  groupIcon,
  groupAvatarUrl,
  groupAccentColor,
  other,
  otherOnline,
}: {
  chatTitle: string;
  isGroup: boolean;
  isSubchat: boolean;
  parentName?: string | null;
  memberCount: number;
  topicIcon?: string | null;
  groupIcon?: string | null;
  groupAvatarUrl?: string | null;
  groupAccentColor?: string | null;
  other?: ChatListItem["otherUser"];
  otherOnline: boolean;
}) {
  const kind = isGroup ? (isSubchat ? "section" : "group") : "direct";
  const heading =
    kind === "direct"
      ? `Начало переписки с ${chatTitle}`
      : kind === "section"
        ? `Начало раздела ${chatTitle}`
        : `Начало группы ${chatTitle}`;
  const detail = isGroup
    ? isSubchat
      ? `Здесь начинается раздел группы ${parentName ?? "Voople"}.`
      : `${memberCount} участников могут писать здесь и переходить в комнату без отдельного звонка.`
    : other
      ? `Поздоровайтесь с @${other.username} или сразу начните голосовой разговор.`
      : "Напишите первое сообщение.";

  return (
    <section
      className="w-full max-w-lg pb-2 pt-10 text-left"
      aria-labelledby="chat-conversation-start-title"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center">
        {isGroup ? (
          <GroupAvatar
            name={chatTitle}
            avatarUrl={groupAvatarUrl ?? null}
            icon={isSubchat ? topicIcon ?? null : groupIcon ?? null}
            accentColor={groupAccentColor ?? null}
            size="md"
            shape="square"
          />
        ) : other ? (
          <ProfileAvatar
            displayName={other.displayName}
            size="sm"
            shape="square"
            isOnline={otherOnline}
            animatedAvatarUrl={other.avatarUrl}
            decorationUrl={other.avatarDecorationUrl}
            ringId={other.avatarRingId}
          />
        ) : null}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">
        {kind === "direct"
          ? "Личная переписка"
          : kind === "section"
            ? "Раздел группы"
            : "Групповой чат"}
      </p>
      <h2
        id="chat-conversation-start-title"
        className="mt-1 text-balance text-lg font-semibold text-[var(--foreground)] sm:text-xl"
      >
        {heading}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
        {detail}
      </p>
    </section>
  );
}
