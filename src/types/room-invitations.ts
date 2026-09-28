import type { GroupNowRoom } from "./group-now";

export type CoreRoomInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export type CoreRoomInviteIntent = "join_room" | "voop" | "split";

export type CoreRoomInviteCandidate = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  invite: {
    id: string;
    status: CoreRoomInviteStatus;
    expiresAt: string;
    shareUrl: string | null;
  } | null;
};

export type CoreRoomInvitePreview = {
  id: string;
  intent: CoreRoomInviteIntent;
  status: CoreRoomInviteStatus;
  requestId?: string;
  requestStatus?: "pending" | "completed" | "declined" | "cancelled" | "expired";
  acceptedCount?: number;
  selectedCount?: number;
  expiresAt: string;
  groupId: string | null;
  groupName: string | null;
  inviter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  room: GroupNowRoom | null;
};
