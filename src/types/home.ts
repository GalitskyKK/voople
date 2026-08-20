import type { ChatRoomParticipantView } from "./chat";

export type HomeNowItem = {
  id: string;
  kind: "person" | "room" | "event" | "invite" | "group";
  title: string;
  subtitle: string | null;
  href: string;
  avatarUrl: string | null;
  userId: string | null;
  online: boolean;
  participants?: ChatRoomParticipantView[];
};

export type HomeOverviewView = {
  viewer: HomeNowItem | null;
  now: HomeNowItem[];
  continue: HomeNowItem[];
  communities: HomeNowItem[];
};
