"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { playlistMetadataDefaultsFromMessage } from "@/lib/chat/playlist-from-message";
import type { ChatReactionEmoji } from "@/lib/chat/reactions";
import { reportProductEvent } from "@/lib/telemetry/client";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageView } from "@/types/chat";

export function useChatMessageActions(chatId: string) {
  const utils = trpc.useUtils();
  const [toast, setToast] = useState<string | null>(null);
  const [playlistConfirmMessage, setPlaylistConfirmMessage] =
    useState<ChatMessageView | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message: string, duration: number) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, duration);
  };

  const removeMessage = trpc.chat.deleteMessage.useMutation({
    onSuccess: (_data, variables) => {
      utils.chat.observeMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        return {
          ...current,
          messages: current.messages.filter((message) => message.id !== variables.messageId),
        };
      });
      void utils.chat.list.invalidate();
    },
    onError: (error) => showToast(error.message, 3_500),
  });

  const addToPlaylist = trpc.playlist.addFromChatMessage.useMutation({
    onSuccess: () => {
      setPlaylistConfirmMessage(null);
      showToast("Добавлено в плейлист", 2_500);
      void utils.playlist.listMine.invalidate();
    },
    onError: (error) => showToast(error.message, 3_500),
  });

  const toggleReaction = trpc.chat.toggleReaction.useMutation({
    onMutate: async ({ messageId, emoji, emojiId }) => {
      await utils.chat.observeMessages.cancel({ chatId });
      const previous = utils.chat.observeMessages.getData({ chatId });
      utils.chat.observeMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        return {
          ...current,
          messages: current.messages.map((message) => {
            if (message.id !== messageId) return message;
            const reactions = [...message.reactions];
            const index = reactions.findIndex((reaction) => emojiId
              ? reaction.emojiId === emojiId
              : reaction.emoji === emoji);
            if (index < 0) {
              reactions.push({
                emoji: emoji ?? "Эмодзи",
                emojiId: emojiId ?? null,
                count: 1,
                reactedByMe: true,
              });
            } else {
              const reaction = reactions[index]!;
              if (reaction.reactedByMe && reaction.count <= 1) reactions.splice(index, 1);
              else {
                reactions[index] = {
                  ...reaction,
                  count: reaction.count + (reaction.reactedByMe ? -1 : 1),
                  reactedByMe: !reaction.reactedByMe,
                };
              }
            }
            return { ...message, reactions };
          }),
        };
      });
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) utils.chat.observeMessages.setData({ chatId }, context.previous);
      showToast(error.message, 3_000);
    },
    onSuccess: (result) => {
      utils.chat.observeMessages.setData({ chatId }, (current) => current ? {
        ...current,
        messages: current.messages.map((message) => message.id === result.messageId
          ? { ...message, reactions: result.reactions }
          : message),
      } : current);
      reportProductEvent("reaction_used", { surface: "chat" });
    },
  });

  const playlistDefaults = useMemo(
    () => playlistConfirmMessage
      ? playlistMetadataDefaultsFromMessage(playlistConfirmMessage)
      : null,
    [playlistConfirmMessage],
  );

  const toggleMessageReaction = (
    messageId: string,
    reaction: { emoji: string; emojiId?: string | null },
  ) => {
    if (toggleReaction.isPending) return;
    toggleReaction.mutate({
      messageId,
      ...(reaction.emojiId
        ? { emojiId: reaction.emojiId }
        : { emoji: reaction.emoji as ChatReactionEmoji }),
    });
  };

  return {
    addToPlaylist,
    playlistConfirmMessage,
    playlistDefaults,
    removeMessage,
    setPlaylistConfirmMessage,
    toast,
    toggleMessageReaction,
  };
}
