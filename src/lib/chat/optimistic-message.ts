import type { PendingChatUpload } from "@/hooks/useChatUpload";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

export function buildOptimisticMessage(input: {
  messageId: string;
  senderId: string;
  text?: string;
  replyTo?: ChatMessageView | null;
  pendingUpload?: PendingChatUpload | null;
  pendingTrack?: PlaylistTrackView | null;
}): ChatMessageView {
  const attachment = input.pendingTrack
    ? { kind: "track" as const, track: input.pendingTrack, ownerId: input.senderId }
    : input.pendingUpload?.kind === "audio" && input.pendingUpload.previewUrl
      ? {
          kind: "audio" as const,
          audioKind: input.pendingUpload.purpose === "voice" ? "voice" as const : "music" as const,
          url: input.pendingUpload.previewUrl,
          title: input.pendingUpload.title ?? "Трек",
          artist: input.pendingUpload.artist ?? "…",
          fileName: input.pendingUpload.fileName,
        }
      : input.pendingUpload?.kind === "circle" && input.pendingUpload.previewUrl
        ? { kind: "circle" as const, url: input.pendingUpload.previewUrl }
        : input.pendingUpload?.kind === "image" && input.pendingUpload.previewUrl
          ? { kind: "image" as const, url: input.pendingUpload.previewUrl }
          : null;

  return {
    id: input.messageId,
    senderId: input.senderId,
    text: input.text?.trim() || null,
    createdAt: new Date().toISOString(),
    isMine: true,
    readAt: null,
    replyTo: input.replyTo
      ? {
          id: input.replyTo.id,
          senderId: input.replyTo.senderId,
          text: input.replyTo.text,
          isMine: input.replyTo.isMine,
        }
      : null,
    attachment,
    reactions: [],
  };
}
