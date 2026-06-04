import type { PlaylistTrackView } from "@/types/playlist";

export type ChatMessageReplyPreview = {
  id: string;
  senderId: string;
  text: string | null;
  isMine: boolean;
};

export type ChatMessageAttachment =
  | { kind: "image"; url: string }
  | { kind: "audio"; url: string; title: string; artist: string; fileName: string }
  | { kind: "track"; track: PlaylistTrackView; ownerId: string };

export type ChatMessageView = {
  id: string;
  senderId: string;
  text: string | null;
  createdAt: string;
  isMine: boolean;
  readAt?: string | null;
  replyTo?: ChatMessageReplyPreview | null;
  attachment?: ChatMessageAttachment | null;
};

export type ChatListItem = {
  id: string;
  type: "direct" | "group";
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    hasVooplePlus: boolean;
  } | null;
  lastMessage: {
    text: string | null;
    createdAt: string;
    senderId: string;
  } | null;
};
