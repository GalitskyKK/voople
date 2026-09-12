import type { VoiceMediaCredentials } from "./voice";

export type RoomGuestInviteUnavailableReason =
  | "missing"
  | "expired"
  | "revoked"
  | "ended"
  | "full";

export type RoomGuestPreviewParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  guest: boolean;
};

export type RoomGuestInvitePreview = {
  available: boolean;
  reason: "active" | RoomGuestInviteUnavailableReason;
  groupName: string | null;
  roomName: string | null;
  participantCount: number;
  participants: RoomGuestPreviewParticipant[];
  expiresAt: string | null;
};

export type RoomGuestJoinResult = {
  guestId: string;
  sessionId: string;
  providerSessionId: string;
  displayName: string;
  expiresAt: string;
};

export type RoomGuestSessionIdentity = Omit<RoomGuestJoinResult, "providerSessionId">;

export type RoomGuestSessionSnapshot = {
  guest: RoomGuestSessionIdentity;
  media: VoiceMediaCredentials;
};

export type RoomGuestConversionStatus =
  | "joined"
  | "already_joined"
  | "requested"
  | "account_linked";

export type RoomGuestConversionResult = {
  status: RoomGuestConversionStatus;
  groupId: string;
  groupName: string;
};
