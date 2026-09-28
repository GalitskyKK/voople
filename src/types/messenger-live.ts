import type { HomeNowItem } from "./home";

export type MessengerGroupLiveState = {
  groupId: string;
  participantCount: number;
  roomCount: number;
  hasScreenShare: boolean;
};

export type MessengerLiveRoomsSnapshot = {
  rooms: HomeNowItem[];
};
