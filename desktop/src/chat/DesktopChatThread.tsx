import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, UsersRound, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatDateDivider } from "@/components/chat/ChatDateDivider";
import { VoiceRoomButton } from "@/components/chat/voice/VoiceRoomButton";
import { buildChatTimeline } from "@/lib/chat/group-messages";
import type { ChatMessageView } from "@/types/chat";

import type { DesktopConfig } from "../config";
import { DesktopChatAvatar } from "./DesktopChatAvatar";
import { DesktopChatComposer } from "./DesktopChatComposer";
import { DesktopGroupInviteSheet } from "./DesktopGroupInviteSheet";
import { DesktopChatMessage } from "./DesktopChatMessage";
import { useDesktopChatThread } from "./useDesktopChatThread";

export function DesktopChatThread({
  chatId,
  config,
  session,
  onBack,
  onInboxChange,
  onlineUserIds,
}: {
  chatId: string;
  config: DesktopConfig;
  session: Session;
  onBack: () => void;
  onInboxChange: () => void;
  onlineUserIds: ReadonlySet<string>;
}) {
  const {
    data,
    deleteMessage,
    error,
    live,
    loading,
    retry,
    sendMessage,
    sending,
    toggleReaction,
  } = useDesktopChatThread(config, session, chatId, onInboxChange);
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [data?.messages.length]);

  if (loading) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 animate-pulse bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]" />
    );
  }

  if (!data) {
    return (
      <div className="voople-chat-window flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-400">
          {error ?? "Не удалось открыть переписку"}
        </p>
        <button type="button" className="voople-button" onClick={retry}>
          Повторить
        </button>
      </div>
    );
  }

  const isGroup = data.chat.type === "group";
  const other = data.otherUser;
  const title = isGroup
    ? data.chat.name || "Группа"
    : other?.displayName || "Чат";
  const timeline = buildChatTimeline(data.messages);

  return (
    <div className="voople-chat-window flex min-h-0 flex-1 flex-col">
      <header className="voople-chat-window__header flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-[var(--app-radius-sm)] p-1 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] lg:hidden"
          aria-label="К списку сообщений"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isGroup ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
            <UsersRound className="h-4 w-4" />
          </span>
        ) : other ? (
          <DesktopChatAvatar
            displayName={other.displayName}
            avatarUrl={other.avatarUrl}
            decorationUrl={other.avatarDecorationUrl}
            ringId={other.avatarRingId}
            isOnline={onlineUserIds.has(other.id)}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-xs text-[var(--app-muted)]">
            {isGroup
              ? `${data.chat.memberCount} участников`
              : other && onlineUserIds.has(other.id)
                ? "в сети"
                : `@${other?.username ?? ""}`}
          </p>
        </div>
        {isGroup &&
        (data.chat.viewerRole === "owner" ||
          data.chat.viewerRole === "admin") ? (
          <DesktopGroupInviteSheet
            chatId={chatId}
            config={config}
            session={session}
          />
        ) : null}
        <VoiceRoomButton
          chatId={chatId}
          chatName={title}
          chatType={isGroup ? "group" : "direct"}
        />
        <span
          className={live ? "desktop-chat-live is-live" : "desktop-chat-live"}
          title={
            live
              ? "Обновления в реальном времени"
              : "Резервная синхронизация"
          }
        >
          <Wifi className="h-4 w-4" />
          <span>{live ? "Live" : "Sync"}</span>
        </span>
      </header>

      <div
        ref={messagesRef}
        data-voople-scroll=""
        className="voople-chat-window__messages voople-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3"
      >
        {!timeline.length ? (
          <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
            Напишите первое сообщение
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          {timeline.map((item) =>
            item.type === "date" ? (
              <ChatDateDivider key={item.key} label={item.label} />
            ) : (
              <DesktopChatMessage
                key={item.message.id}
                message={item.message}
                showSender={isGroup}
                onReply={setReplyTo}
                onDelete={(messageId) => {
                  if (replyTo?.id === messageId) setReplyTo(null);
                  void deleteMessage(messageId);
                }}
                onToggleReaction={(messageId, emoji) =>
                  void toggleReaction(messageId, emoji)
                }
              />
            ),
          )}
        </div>
      </div>

      {error ? (
        <p className="form-error desktop-chat-thread-error" role="alert">
          {error}
        </p>
      ) : null}
      <DesktopChatComposer
        config={config}
        session={session}
        replyTo={replyTo}
        sending={sending}
        onCancelReply={() => setReplyTo(null)}
        onSend={sendMessage}
      />
    </div>
  );
}
