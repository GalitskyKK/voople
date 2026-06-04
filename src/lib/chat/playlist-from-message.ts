import type { ChatMessageView } from "@/types/chat";

export function messageHasMusicForPlaylist(message: ChatMessageView) {
  const attachment = message.attachment;
  return attachment?.kind === "track" || attachment?.kind === "audio";
}

export function playlistMetadataDefaultsFromMessage(message: ChatMessageView): {
  title: string;
  artist: string;
} {
  const attachment = message.attachment;
  if (attachment?.kind === "track") {
    return { title: attachment.track.title, artist: attachment.track.artist };
  }
  if (attachment?.kind === "audio") {
    return { title: attachment.title, artist: attachment.artist };
  }
  return { title: "Трек", artist: "Неизвестный исполнитель" };
}
