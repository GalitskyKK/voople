"use client";

import type { ChatMessageAttachment } from "@/types/chat";

import { ChatMusicCard } from "./ChatMusicCard";

type ChatAttachmentTrackProps = {
  messageId: string;
  attachment: Extract<ChatMessageAttachment, { kind: "track" }>;
  isMine: boolean;
};

export function ChatAttachmentTrack({ messageId, attachment, isMine }: ChatAttachmentTrackProps) {
  const { track } = attachment;

  return (
    <ChatMusicCard
      messageId={messageId}
      title={track.title}
      subtitle={track.artist}
      isMine={isMine}
      track={track}
    />
  );
}
