import type { GroupNowRoom } from "./group-now";

export type HomeRoomTarget =
  | { context: "group"; groupId: string; room: GroupNowRoom }
  | { context: "direct"; chatId: string; room: GroupNowRoom };

export type HomeRoomParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type HomeNowItem = {
  id: string;
  kind: "person" | "room" | "event" | "invite" | "group";
  title: string;
  subtitle: string | null;
  href: string;
  avatarUrl: string | null;
  avatarDecorationUrl?: string | null;
  avatarRingId?: string | null;
  userId: string | null;
  messageUsername?: string;
  online: boolean;
  activity?: "online" | "listening" | "playing" | "in_room";
  score?: number;
  unreadCount?: number;
  pinned?: boolean;
  conversationId?: string;
  roomTarget?: HomeRoomTarget;
  participants?: HomeRoomParticipant[];
};

export type HomeOverviewView = {
  viewer: HomeNowItem | null;
  now: HomeNowItem[];
  continue: HomeNowItem[];
  continueCandidates: HomeNowItem[];
  communities: HomeNowItem[];
};
