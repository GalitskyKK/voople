"use client";

import { ChatMusicCard } from "./ChatMusicCard";
import { ChatVoiceMessage } from "./ChatVoiceMessage";

type ChatAttachmentAudioProps = {
  messageId: string;
  url: string;
  title: string;
  artist: string;
  audioKind: "music" | "voice";
  isMine: boolean;
};

export function ChatAttachmentAudio({ messageId, url, title, artist, audioKind, isMine }: ChatAttachmentAudioProps) {
  if (audioKind === "voice") return <ChatVoiceMessage url={url} durationLabel={artist} />;
  return <ChatMusicCard messageId={messageId} title={title} subtitle={artist} isMine={isMine} streamUrl={url} />;
}
