import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ChatListItem,
  ChatMessageAttachment,
  ChatMessageReaction,
  ChatMessageView,
  ChatPendingUpload,
  ChatThreadSummary,
  GroupEmojiView,
} from "@/types/chat";
import { parseComposerContent } from "@/lib/chat/message-content";

import { createDesktopTrpcClient } from "../api/trpc";
import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";

export type DesktopChatThreadData = {
  messages: ChatMessageView[];
  otherUser: ChatListItem["otherUser"];
  chat: ChatThreadSummary & Pick<ChatListItem, "viewerRole">;
};

export type DesktopMessageDraft = {
  text: string;
  replyTo: ChatMessageView | null;
  upload: ChatPendingUpload | null;
  customEmojis?: GroupEmojiView[];
};

function parseThread(value: unknown): DesktopChatThreadData {
  if (!value || typeof value !== "object") {
    throw new Error("Сервер вернул некорректную переписку");
  }
  const thread = value as Partial<DesktopChatThreadData>;
  if (!Array.isArray(thread.messages) || !thread.chat) {
    throw new Error("Сервер вернул некорректную переписку");
  }
  return thread as DesktopChatThreadData;
}

function attachmentFromUpload(
  upload: ChatPendingUpload | null,
): ChatMessageAttachment | null {
  if (!upload?.previewUrl) return null;
  if (upload.kind === "image") {
    return { kind: "image", url: upload.previewUrl };
  }
  if (upload.kind === "circle") {
    return { kind: "circle", url: upload.previewUrl };
  }
  return {
    kind: "audio",
    audioKind: upload.purpose === "voice" ? "voice" : "music",
    url: upload.previewUrl,
    title: upload.title?.trim() || upload.fileName,
    artist: upload.artist?.trim() || "Аудиосообщение",
    fileName: upload.fileName,
  };
}

function toggleOptimisticReaction(
  reactions: ChatMessageReaction[],
  reactionInput: { emoji: string; emojiId?: string | null },
) {
  const next = [...reactions];
  const index = next.findIndex((reaction) => reactionInput.emojiId
    ? reaction.emojiId === reactionInput.emojiId
    : reaction.emoji === reactionInput.emoji);
  if (index < 0) {
    next.push({ ...reactionInput, count: 1, reactedByMe: true });
    return next;
  }
  const reaction = next[index]!;
  if (reaction.reactedByMe && reaction.count <= 1) {
    next.splice(index, 1);
  } else {
    next[index] = {
      ...reaction,
      count: reaction.count + (reaction.reactedByMe ? -1 : 1),
      reactedByMe: !reaction.reactedByMe,
    };
  }
  return next;
}

export function useDesktopChatThread(
  config: DesktopConfig,
  session: Session,
  chatId: string,
  onInboxChange: () => void,
) {
  const [data, setData] = useState<DesktopChatThreadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const requestId = useRef(0);
  const onInboxChangeRef = useRef(onInboxChange);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const currentRequest = ++requestId.current;
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      try {
        const thread = parseThread(
          await client.query("chat.getMessages", { chatId }),
        );
        if (currentRequest === requestId.current) setData(thread);
      } catch (loadError) {
        if (currentRequest === requestId.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить переписку",
          );
        }
      } finally {
        if (currentRequest === requestId.current && !silent) setLoading(false);
      }
    },
    [chatId, client],
  );

  useEffect(() => {
    onInboxChangeRef.current = onInboxChange;
  }, [onInboxChange]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const supabase = getSupabase(config);
    const channel = supabase
      .channel(`desktop:chat:${chatId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          void load({ silent: true });
          onInboxChangeRef.current();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: `chat_id=eq.${chatId}`,
        },
        () => void load({ silent: true }),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const pollId = window.setInterval(() => {
      void load({ silent: true });
    }, 15_000);

    return () => {
      requestId.current += 1;
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [chatId, config, load]);

  const sendMessage = useCallback(
    async (draft: DesktopMessageDraft) => {
      const { text, replyTo, upload } = draft;
      const trimmed = text.trim();
      if ((!trimmed && !upload) || sending) return false;
      const messageId = crypto.randomUUID();
      const optimistic: ChatMessageView = {
        id: messageId,
        senderId: session.user.id,
        text: trimmed || null,
        createdAt: new Date().toISOString(),
        isMine: true,
        sender: {
          username:
            session.user.user_metadata.username ??
            session.user.email?.split("@")[0] ??
            "me",
          displayName:
            session.user.user_metadata.display_name ??
            session.user.user_metadata.full_name ??
            "Вы",
          avatarUrl: session.user.user_metadata.avatar_url ?? null,
        },
        readAt: null,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderId: replyTo.senderId,
              text: replyTo.text,
              isMine: replyTo.isMine,
            }
          : null,
        attachment: attachmentFromUpload(upload),
        reactions: [],
      };

      setSending(true);
      setError(null);
      setData((current) =>
        current
          ? { ...current, messages: [...current.messages, optimistic] }
          : current,
      );

      try {
        const sent = (await client.mutation("chat.send", {
          chatId,
          messageId,
          text: trimmed || undefined,
          content: draft.customEmojis?.length && trimmed
            ? parseComposerContent(trimmed, draft.customEmojis)
            : undefined,
          mediaKey: upload?.mediaKey,
          mediaTitle:
            upload?.kind === "audio"
              ? upload.title?.trim() || upload.fileName
              : undefined,
          mediaArtist:
            upload?.kind === "audio"
              ? upload.artist?.trim() || "Аудиосообщение"
              : undefined,
          replyToMessageId: replyTo?.id,
        })) as ChatMessageView;
        setData((current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((message) =>
                  message.id === messageId
                    ? { ...sent, sender: optimistic.sender }
                    : message,
                ),
              }
            : current,
        );
        onInboxChange();
        return true;
      } catch (sendError) {
        setData((current) =>
          current
            ? {
                ...current,
                messages: current.messages.filter(
                  (message) => message.id !== messageId,
                ),
              }
            : current,
        );
        setError(
          sendError instanceof Error
            ? sendError.message
            : "Не удалось отправить сообщение",
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      chatId,
      client,
      onInboxChange,
      sending,
      session.user.email,
      session.user.id,
      session.user.user_metadata,
    ],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const previous = data;
      setError(null);
      setData((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter(
                (message) => message.id !== messageId,
              ),
            }
          : current,
      );
      try {
        await client.mutation("chat.deleteMessage", { messageId });
        onInboxChange();
      } catch (deleteError) {
        setData(previous);
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Не удалось удалить сообщение",
        );
      }
    },
    [client, data, onInboxChange],
  );

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      const previous = data;
      const trimmed = text.trim();
      if (!trimmed) return false;
      setError(null);
      setData((current) => current ? {
        ...current,
        messages: current.messages.map((message) =>
          message.id === messageId ? { ...message, text: trimmed } : message,
        ),
      } : current);
      try {
        const updated = (await client.mutation("chat.editMessage", {
          messageId,
          text: trimmed,
        })) as ChatMessageView;
        setData((current) => current ? {
          ...current,
          messages: current.messages.map((message) =>
            message.id === messageId ? { ...updated, sender: message.sender } : message,
          ),
        } : current);
        onInboxChange();
        return true;
      } catch (editError) {
        setData(previous);
        setError(
          editError instanceof Error
            ? editError.message
            : "Не удалось изменить сообщение",
        );
        return false;
      }
    },
    [client, data, onInboxChange],
  );

  const toggleReaction = useCallback(
    async (messageId: string, reaction: { emoji: string; emojiId?: string | null }) => {
      const previous = data;
      setError(null);
      setData((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      reactions: toggleOptimisticReaction(
                        message.reactions,
                        reaction,
                      ),
                    }
                  : message,
              ),
            }
          : current,
      );
      try {
        const result = (await client.mutation("chat.toggleReaction", {
          messageId,
          ...(reaction.emojiId ? { emojiId: reaction.emojiId } : { emoji: reaction.emoji }),
        })) as { messageId: string; reactions: ChatMessageReaction[] };
        setData((current) =>
          current
            ? {
                ...current,
                messages: current.messages.map((message) =>
                  message.id === result.messageId
                    ? { ...message, reactions: result.reactions }
                    : message,
                ),
              }
            : current,
        );
      } catch (reactionError) {
        setData(previous);
        setError(
          reactionError instanceof Error
            ? reactionError.message
            : "Не удалось изменить реакцию",
        );
      }
    },
    [client, data],
  );

  return {
    data,
    deleteMessage,
    editMessage,
    error,
    live,
    loading,
    retry: () => load(),
    sendMessage,
    sending,
    toggleReaction,
  };
}
