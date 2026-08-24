"use client";

import type { Dispatch, SetStateAction } from "react";

import { buildOptimisticMessage } from "@/lib/chat/optimistic-message";
import { recoverFailedSendText, recoverFailedSendValue } from "@/lib/chat/send-draft-recovery";
import { reportProductEvent } from "@/lib/telemetry/client";
import { trpc } from "@/lib/trpc/client";
import type { PendingChatUpload } from "@/hooks/useChatUpload";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

export function useChatSendMutation({
  chatId,
  viewerId,
  text,
  replyTo,
  pendingUpload,
  pendingTrack,
  setText,
  setReplyTo,
  setPendingUpload,
  setPendingTrack,
}: {
  chatId: string;
  viewerId?: string | null;
  text: string;
  replyTo: ChatMessageView | null;
  pendingUpload: PendingChatUpload | null;
  pendingTrack: PlaylistTrackView | null;
  setText: Dispatch<SetStateAction<string>>;
  setReplyTo: Dispatch<SetStateAction<ChatMessageView | null>>;
  setPendingUpload: Dispatch<SetStateAction<PendingChatUpload | null>>;
  setPendingTrack: Dispatch<SetStateAction<PlaylistTrackView | null>>;
}) {
  const utils = trpc.useUtils();

  return trpc.chat.send.useMutation({
    onMutate: async (input) => {
      await utils.chat.getMessages.cancel({ chatId });
      const previous = utils.chat.getMessages.getData({ chatId });
      const replyMessage = input.replyToMessageId
        ? previous?.messages.find((message) => message.id === input.replyToMessageId) ?? replyTo
        : null;
      const optimistic = buildOptimisticMessage({
        messageId: input.messageId,
        senderId: viewerId ?? "me",
        text: input.text,
        replyTo: replyMessage,
        pendingUpload,
        pendingTrack,
      });
      utils.chat.getMessages.setData({ chatId }, (current) =>
        current?.messages.some((message) => message.id === optimistic.id)
          ? current
          : current
            ? { ...current, messages: [...current.messages, optimistic] }
            : {
                messages: [optimistic],
                otherUser: null,
                chat: {
                  id: chatId,
                  type: "direct",
                  name: null,
                  parentChatId: null,
                  topicsEnabled: false,
                  topicsLayout: "list",
                  topicIcon: null,
                  groupVisibility: "private",
                  joinPolicy: "invite_only",
                  sectionAccessMode: "inherit",
                  groupIcon: null,
                  groupAvatarUrl: null,
                  groupBannerUrl: null,
                  groupTag: null,
                  groupAccentColor: null,
                  boostCount: 0,
                  boostedByMe: false,
                  memberCount: 0,
                  viewerRole: "member",
                },
              },
      );
      const draft = { text, replyTo, pendingUpload, pendingTrack };
      setText("");
      setReplyTo(null);
      setPendingUpload(null);
      setPendingTrack(null);
      return { previous, draft };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) utils.chat.getMessages.setData({ chatId }, context.previous);
      if (!context?.draft) return;
      setText((current) => recoverFailedSendText(current, context.draft.text));
      setReplyTo((current) => recoverFailedSendValue(current, context.draft.replyTo));
      setPendingUpload((current) => recoverFailedSendValue(current, context.draft.pendingUpload));
      setPendingTrack((current) => recoverFailedSendValue(current, context.draft.pendingTrack));
    },
    onSuccess: (message, input, context) => {
      utils.chat.getMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        const messages = current.messages.map((item) => item.id === message.id ? message : item);
        return messages.some((item) => item.id === message.id)
          ? { ...current, messages }
          : { ...current, messages: [...messages, message] };
      });
      void utils.chat.list.invalidate();
      if (context?.draft.pendingUpload?.previewUrl) URL.revokeObjectURL(context.draft.pendingUpload.previewUrl);
      reportProductEvent("message_sent", {
        hasAttachment: Boolean(input.mediaKey || input.sharedTrackId),
        hasReply: Boolean(input.replyToMessageId),
      });
      if (input.replyToMessageId) reportProductEvent("message_replied", { source: "composer" });
      if (input.mediaKey || input.sharedTrackId) {
        reportProductEvent("attachment_sent", { kind: input.mediaKey ? "upload" : "track" });
      }
    },
  });
}
