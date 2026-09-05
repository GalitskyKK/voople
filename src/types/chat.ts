import type { PlaylistTrackView } from "@/types/playlist";

export type ChatMessageReplyPreview = {
  id: string;
  senderId: string;
  text: string | null;
  isMine: boolean;
};

export type ChatMessageReaction = {
  emoji: string;
  emojiId?: string | null;
  emojiUrl?: string | null;
  emojiName?: string | null;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessageContentNode =
  | { type: "text"; text: string }
  | { type: "customEmoji"; emojiId: string; name: string; url: string | null }
  | { type: "gift"; itemId: string; itemName: string; message: string | null }
  | {
      type: "roomEvent";
      event: "started" | "ended" | "missed" | "declined" | "cancelled";
      durationSeconds: number | null;
      roomKind?: "direct" | "group";
    };

export type GroupEmojiView = {
  id: string;
  name: string;
  url: string;
  animated: boolean;
  createdBy: string;
};

export type GroupSoundView = {
  id: string;
  name: string;
  url: string;
  durationMs: number;
  createdBy: string;
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
  content?: ChatMessageContentNode[] | null;
  createdAt: string;
  isMine: boolean;
  sender?: {
    username: string;
    displayName: string;
    hasVooplePlus?: boolean;
    avatarUrl?: string | null;
  } | null;
  readAt?: string | null;
  replyTo?: ChatMessageReplyPreview | null;
  attachment?: ChatMessageAttachment | null;
  reactions: ChatMessageReaction[];
};

export type ChatMessageNotificationView = {
  messageId: string;
  chatId: string;
  senderName: string;
  chatTitle: string;
  previewText: string;
};

export type GroupVisibility = "private" | "unlisted" | "public";
export type GroupJoinPolicy = "open" | "request" | "invite_only";

export type ChatListItem = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  parentChatId: string | null;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  topicIcon: string | null;
  groupVisibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  sectionAccessMode: "inherit" | "restricted";
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupTag: string | null;
  groupAccentColor: string | null;
  boostCount: number;
  boostedByMe: boolean;
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
    lastSeenAt: string | null;
  } | null;
  lastMessage: {
    text: string | null;
    preview: string;
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
  roleColor: string | null;
  activeRoom?: {
    chatId: string;
    name: string;
  } | null;
};

export type ChatGroupAuditAction =
  | "member_added"
  | "member_removed"
  | "member_left"
  | "role_changed"
  | "ownership_transferred"
  | "topics_changed"
  | "visibility_changed"
  | "group_name_changed";

export type ChatGroupAuditActor = {
  id: string;
  username: string;
  displayName: string;
};

export type ChatGroupAuditEntryView = {
  id: string;
  action: ChatGroupAuditAction;
  createdAt: string;
  actor: ChatGroupAuditActor | null;
  target: ChatGroupAuditActor | null;
  details: Record<string, string | number | boolean | null>;
};

export type PublicGroupSearchHit = {
  id: string;
  name: string;
  publicSlug: string | null;
  icon: string | null;
  avatarUrl: string | null;
  tag: string | null;
  memberCount: number;
  joined: boolean;
  joinPolicy: GroupJoinPolicy;
  joinRequestPending: boolean;
};

export type PublicGroupPageView = PublicGroupSearchHit & {
  description: string | null;
  accentColor: string | null;
  bannerUrl: string | null;
};

export type GroupCustomizationInput = {
  description: string | null;
  icon: string | null;
  publicSlug: string | null;
  accentColor: string | null;
  tag: string | null;
  vanityInviteSlug: string | null;
  roleColors: Record<"owner" | "admin" | "member", string | null>;
  avatarKey?: string | null;
  bannerKey?: string | null;
};

export type GroupCommunityView = {
  description: string | null;
  icon: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  effectiveBannerUrl: string | null;
  tag: string | null;
  effectiveTag: string | null;
  tagEquippedByMe?: boolean;
  vanityInviteSlug: string | null;
  roleColors: Record<"owner" | "admin" | "member", string | null>;
  effectiveRoleColors: Record<"owner" | "admin" | "member", string | null>;
  publicSlug: string | null;
  accentColor: string | null;
  effectiveAccentColor: string | null;
  boostCount: number;
  boostedByMe: boolean;
  canBoost: boolean;
  boostUnlocksAccent: boolean;
  boostUnlocksBanner: boolean;
  boostUnlocksTag: boolean;
  boostUnlocksVanityInvite: boolean;
  boostUnlocksRoleStyles: boolean;
  boostSlots: Array<{
    slot: 1 | 2 | 3;
    chatId: string | null;
    assignedHere: boolean;
    cooldownUntil: string | null;
  }>;
  groupLevel: 0 | 1 | 3 | 6 | 12 | 24;
  perkCapacity: number;
  perkUsed: number;
  perks: Array<{
    id: string;
    name: string;
    description: string;
    cost: number;
    milestone: 1 | 3 | 6 | 12 | 24;
    icon: "palette" | "smile" | "image" | "upload" | "tag" | "link" | "roles" | "hd";
    selected: boolean;
    status: "active" | "available" | "locked" | "suspended";
  }>;
  animatedIconEnabled: boolean;
  animatedBannerEnabled: boolean;
  emojiSoundEnabled: boolean;
  largeUploadsEnabled: boolean;
  hdRoomEnabled: boolean;
  graceUntil: string | null;
};

export type GroupJoinRequestView = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
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
  | "groupVisibility"
  | "joinPolicy"
  | "sectionAccessMode"
  | "groupIcon"
  | "groupAvatarUrl"
  | "groupBannerUrl"
  | "groupTag"
  | "groupAccentColor"
  | "boostCount"
  | "boostedByMe"
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
  guest?: boolean;
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
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupTag: string | null;
  groupAccentColor: string | null;
  memberCount: number;
  onlineCount: number;
  roomParticipantCount: number;
  expiresAt: string | null;
};
