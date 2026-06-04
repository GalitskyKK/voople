"use client";

import { ChatMusicCard } from "./ChatMusicCard";

type ChatAttachmentAudioProps = {
  messageId: string;
  url: string;
  title: string;
  artist: string;
  isMine: boolean;
};

export function ChatAttachmentAudio({
  messageId,
  url,
  title,
  artist,
  isMine,
}: ChatAttachmentAudioProps) {
  return (
    <ChatMusicCard
      messageId={messageId}
      title={title}
      subtitle={artist}
      isMine={isMine}
      streamUrl={url}
    />
  );
}
