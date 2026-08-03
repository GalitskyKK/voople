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

export type ChatPendingUpload = {
  mediaKey: string;
  kind: "image" | "audio" | "circle";
  previewUrl: string | null;
  fileName: string;
  title?: string;
  artist?: string;
  durationSeconds?: number | null;
  purpose?: "voice" | "circle";
};

export type ChatMessageView = {
  id: string;
  senderId: string;
  text: string | null;
  createdAt: string;
  isMine: boolean;
  sender?: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
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
  parentChatId: string | null;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  topicIcon: string | null;
  memberCount: number;
  viewerRole: "owner" | "admin" | "member";
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    hasVooplePlus: boolean;
    avatarUrl: string | null;
    avatarDecorationUrl: string | null;
    avatarRingId: string | null;
  } | null;
  lastMessage: {
    text: string | null;
    createdAt: string;
    senderId: string;
  } | null;
  channels: ChatListItem[];
};

export type ChatGroupMemberView = {
  type: "user";
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  hasVooplePlus?: boolean;
  avatarUrl?: string | null;
  role: "owner" | "admin" | "member";
};

export type ChatThreadSummary = Pick<
  ChatListItem,
  | "id"
  | "type"
  | "name"
  | "parentChatId"
  | "topicsEnabled"
  | "topicsLayout"
  | "topicIcon"
  | "memberCount"
> & {
  parentName?: string | null;
};

export type ChatRoomParticipantView = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarDecorationUrl: string | null;
  avatarRingId: string | null;
  micMuted: boolean;
  isMe: boolean;
};

export type ChatRoomView = {
  status: "empty" | "ringing" | "active";
  accessMode: "open" | "locked";
  startedBy: string | null;
  startedAt: string | null;
  endReason: "declined" | "cancelled" | "missed" | "ended" | null;
  participants: ChatRoomParticipantView[];
  isInside: boolean;
};

export type IncomingCallView = {
  chatId: string;
  chatName: string;
  chatType: "direct";
  startedAt: string;
  caller: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    avatarDecorationUrl: string | null;
    avatarRingId: string | null;
  };
};

export type ChatInvitePreview = {
  available: boolean;
  reason: "active" | "expired" | "revoked" | "used" | "missing";
  chatId: string | null;
  chatName: string | null;
  memberCount: number;
  expiresAt: string | null;
};
