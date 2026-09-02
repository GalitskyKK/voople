import type { GroupNowRoom } from "./group-now";

export type CoreRoomInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export type CoreRoomInviteCandidate = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  invite: {
    id: string;
    status: CoreRoomInviteStatus;
    expiresAt: string;
  } | null;
};

export type CoreRoomInvitePreview = {
  id: string;
  status: CoreRoomInviteStatus;
  expiresAt: string;
  groupId: string | null;
  room: GroupNowRoom | null;
};
