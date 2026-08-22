"use client";

import type { ChatMessageAttachment as ChatMessageAttachmentModel } from "@/types/chat";

import { ChatAttachmentAudio } from "./ChatAttachmentAudio";
import { ChatAttachmentCircle } from "./ChatAttachmentCircle";
import { ChatAttachmentImage } from "./ChatAttachmentImage";
import { ChatAttachmentTrack } from "./ChatAttachmentTrack";

export function ChatMessageAttachment({
  messageId,
  attachment,
  isMine,
  onOpenImage,
}: {
  messageId: string;
  attachment: ChatMessageAttachmentModel | null | undefined;
  isMine: boolean;
  onOpenImage?: (url: string) => void;
}) {
  if (!attachment) return null;

  if (attachment.kind === "image") {
    return (
      <ChatAttachmentImage
        url={attachment.url}
        onOpen={() => onOpenImage?.(attachment.url)}
      />
    );
  }

  if (attachment.kind === "audio") {
    return (
      <ChatAttachmentAudio
        messageId={messageId}
        url={attachment.url}
        title={attachment.title}
        artist={attachment.artist}
        audioKind={attachment.audioKind}
        isMine={isMine}
      />
    );
  }

  if (attachment.kind === "circle") {
    return <ChatAttachmentCircle url={attachment.url} />;
  }

  return (
    <ChatAttachmentTrack
      messageId={messageId}
      attachment={attachment}
      isMine={isMine}
    />
  );
}
