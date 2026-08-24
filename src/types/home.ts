import type { ChatRoomParticipantView } from "./chat";

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
  participants?: ChatRoomParticipantView[];
};

export type HomeOverviewView = {
  viewer: HomeNowItem | null;
  now: HomeNowItem[];
  continue: HomeNowItem[];
  communities: HomeNowItem[];
};
