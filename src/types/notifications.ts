import type { CoreRoomInvitePreview } from "./room-invitations";

export type NotificationView = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    hasVooplePlus?: boolean;
  } | null;
  referenceId: string | null;
  profileUsername: string | null;
  roomInvite: CoreRoomInvitePreview | null;
};
