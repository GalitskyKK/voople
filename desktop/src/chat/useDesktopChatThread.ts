import type { Session } from "@supabase/supabase-js";
import { useCallback, useState } from "react";

import { buildOptimisticMessage } from "@/lib/chat/optimistic-message";
import { parseComposerContent } from "@/lib/chat/message-content";
import type { ChatReactionEmoji } from "@/lib/chat/reactions";
import { reportProductEvent } from "@/lib/telemetry/client";
import { trpc } from "@/lib/trpc/client";
import type {
  ChatListItem,
  ChatMessageView,
  ChatPendingUpload,
  ChatThreadSummary,
  GroupEmojiView,
} from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

import type { DesktopConfig } from "../config";
import { useDesktopChatRealtime } from "./useDesktopChatRealtime";

export type DesktopChatThreadData = {
  messages: ChatMessageView[];
  otherUser: ChatListItem["otherUser"];
  chat: ChatThreadSummary & Pick<ChatListItem, "viewerRole">;
};

export type DesktopMessageDraft = {
  text: string;
  replyTo: ChatMessageView | null;
  upload: ChatPendingUpload | null;
  pendingTrack: PlaylistTrackView | null;
  customEmojis?: GroupEmojiView[];
};

export function useDesktopChatThread(
  config: DesktopConfig,
  session: Session,
  chatId: string,
  onInboxChange: () => void,
) {
  const utils = trpc.useUtils();
  const [actionError, setActionError] = useState<string | null>(null);
  const query = trpc.chat.observeMessages.useQuery(
    { chatId },
    {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
    },
  );
  const live = useDesktopChatRealtime({
    chatId,
    config,
    messages: query.data?.messages,
    onInboxChange,
  });
  const send = trpc.chat.send.useMutation();
  const edit = trpc.chat.editMessage.useMutation();
  const remove = trpc.chat.deleteMessage.useMutation();
  const reaction = trpc.chat.toggleReaction.useMutation();

  const sendMessage = useCallback(async (draft: DesktopMessageDraft) => {
    const trimmed = draft.text.trim();
    if ((!trimmed && !draft.upload && !draft.pendingTrack) || send.isPending) return false;
    const messageId = crypto.randomUUID();
    const previous = utils.chat.observeMessages.getData({ chatId });
    const optimistic = buildOptimisticMessage({
      messageId,
      senderId: session.user.id,
      text: trimmed,
      replyTo: draft.replyTo,
      pendingUpload: draft.upload,
      pendingTrack: draft.pendingTrack,
    });
    setActionError(null);
    await utils.chat.observeMessages.cancel({ chatId });
    utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
      ...current,
      messages: [...current.messages, optimistic],
    } : current);
    try {
      const sent = await send.mutateAsync({
        chatId,
        messageId,
        text: trimmed || undefined,
        content: draft.customEmojis?.length && trimmed
          ? parseComposerContent(trimmed, draft.customEmojis)
          : undefined,
        mediaKey: draft.upload?.mediaKey,
        mediaTitle: draft.upload?.kind === "audio"
          ? draft.upload.title?.trim() || draft.upload.fileName
          : undefined,
        mediaArtist: draft.upload?.kind === "audio"
          ? draft.upload.artist?.trim() || "Аудиосообщение"
          : undefined,
        replyToMessageId: draft.replyTo?.id,
        sharedTrackId: draft.pendingTrack?.id,
      });
      utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId ? sent : message),
      } : current);
      void utils.chat.list.invalidate();
      onInboxChange();
      reportProductEvent("message_sent", {
        hasAttachment: Boolean(draft.upload || draft.pendingTrack),
        hasReply: Boolean(draft.replyTo),
      });
      if (draft.replyTo) {
        reportProductEvent("message_replied", { source: "composer" });
      }
      if (draft.upload || draft.pendingTrack) {
        reportProductEvent("attachment_sent", {
          kind: draft.upload?.kind ?? "track",
        });
      }
      return true;
    } catch (error) {
      if (previous) utils.chat.observeMessages.setData({ chatId }, previous);
      setActionError(error instanceof Error ? error.message : "Не удалось отправить сообщение");
      return false;
    }
  }, [chatId, onInboxChange, send, session.user.id, utils]);

  const editMessage = useCallback(async (messageId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    setActionError(null);
    try {
      const updated = await edit.mutateAsync({ messageId, text: trimmed });
      utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId ? { ...updated, sender: message.sender } : message),
      } : current);
      void utils.chat.list.invalidate();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось изменить сообщение");
      return false;
    }
  }, [chatId, edit, utils]);

  const deleteMessage = useCallback(async (messageId: string) => {
    setActionError(null);
    try {
      await remove.mutateAsync({ messageId });
      utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.filter((message) => message.id !== messageId),
      } : current);
      void utils.chat.list.invalidate();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось удалить сообщение");
    }
  }, [chatId, remove, utils]);

  const toggleReaction = useCallback(async (
    messageId: string,
    value: { emoji: string; emojiId?: string | null },
  ) => {
    setActionError(null);
    try {
      const result = await reaction.mutateAsync({
        messageId,
        ...(value.emojiId
          ? { emojiId: value.emojiId }
          : { emoji: value.emoji as ChatReactionEmoji }),
      });
      utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.map((message) =>
          message.id === result.messageId
            ? { ...message, reactions: result.reactions }
            : message),
      } : current);
      reportProductEvent("reaction_used", { surface: "chat" });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось изменить реакцию");
    }
  }, [chatId, reaction, utils]);

  return {
    data: query.data ?? null,
    deleteMessage,
    editMessage,
    error: actionError ?? query.error?.message ?? null,
    live,
    loading: query.isLoading,
    retry: () => void query.refetch(),
    sendMessage,
    sending: send.isPending,
    toggleReaction,
  };
}
