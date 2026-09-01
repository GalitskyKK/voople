export type GroupNowRoomKind = "lobby" | "temporary" | "pinned";
export type GroupNowRoomState = "idle" | "connecting" | "active" | "grace";

export type GroupNowUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type GroupNowParticipant = GroupNowUser & {
  isMe: boolean;
  micMuted: boolean | null;
  cameraEnabled: boolean | null;
  screenSharing: boolean | null;
};

export type GroupNowRoom = {
  id: string;
  kind: GroupNowRoomKind;
  name: string;
  joinTarget:
    | { kind: "room"; roomId: string }
    | { kind: "legacy"; chatId: string };
  state: GroupNowRoomState;
  liveSessionId: string | null;
  startedAt: string | null;
  startedBy: string | null;
  participantCount: number;
  hasScreenShare: boolean;
  participants: GroupNowParticipant[];
};

export type GroupNowView = {
  groupId: string;
  groupName: string;
  rooms: GroupNowRoom[];
  onlineOutsideRooms: GroupNowUser[];
  visibleOnlineCount: number;
  currentUserRoomId: string | null;
};
