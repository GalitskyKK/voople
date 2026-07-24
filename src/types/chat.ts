import type { PlaylistTrackView } from "@/types/playlist";

export type ChatMessageReplyPreview = {
  id: string;
  senderId: string;
  text: string | null;
  isMine: boolean;
};

export type ChatMessageReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessageAttachment =
  | { kind: "image"; url: string }
  | {
      kind: "audio";
      audioKind: "music" | "voice";
      url: string;
      title: string;
      artist: string;
      fileName: string;
    }
  | { kind: "circle"; url: string }
  | { kind: "track"; track: PlaylistTrackView; ownerId: string };

export type ChatMessageView = {
  id: string;
  senderId: string;
  text: string | null;
  createdAt: string;
  isMine: boolean;
  sender?: {
    username: string;
    displayName: string;
  } | null;
  readAt?: string | null;
  replyTo?: ChatMessageReplyPreview | null;
  attachment?: ChatMessageAttachment | null;
  reactions: ChatMessageReaction[];
};

export type ChatListItem = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  memberCount: number;
  viewerRole: "owner" | "admin" | "member";
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

export type ChatThreadSummary = Pick<ChatListItem, "id" | "type" | "name" | "memberCount">;

export type ChatRoomParticipantView = {
  id: string;
  username: string;
  displayName: string;
  micMuted: boolean;
  isMe: boolean;
};

export type ChatRoomView = {
  status: "empty" | "active";
  accessMode: "open" | "locked";
  startedBy: string | null;
  startedAt: string | null;
  participants: ChatRoomParticipantView[];
  isInside: boolean;
};

export type ChatInvitePreview = {
  available: boolean;
  reason: "active" | "expired" | "revoked" | "used" | "missing";
  chatId: string | null;
  chatName: string | null;
  memberCount: number;
  expiresAt: string | null;
};
