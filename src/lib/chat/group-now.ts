import type {
  GroupNowParticipant,
  GroupNowRoom,
  GroupNowRoomKind,
  GroupNowRoomState,
  GroupNowUser,
  GroupNowView,
} from "@/types/group-now";

export type GroupNowRoomInput = {
  id: string;
  kind: GroupNowRoomKind;
  name: string;
  createdAt: string;
};

export type GroupNowSessionInput = {
  id: string;
  roomId: string;
  status: Exclude<GroupNowRoomState, "idle">;
  startedAt: string;
  startedBy: string;
};

export type GroupNowParticipantInput = {
  sessionId: string;
  user: GroupNowUser;
  micMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
};

export type LegacyGroupRoomPresenceInput = {
  chatId: string;
  roomName: string;
  user: GroupNowUser;
};

export type BuildGroupNowViewInput = {
  groupId: string;
  groupName: string;
  viewerId: string;
  rooms: GroupNowRoomInput[];
  sessions: GroupNowSessionInput[];
  participants: GroupNowParticipantInput[];
  legacyPresence: LegacyGroupRoomPresenceInput[];
  onlineUsers: GroupNowUser[];
};

function roomStatePriority(state: GroupNowRoomState) {
  if (state === "active") return 0;
  if (state === "connecting") return 1;
  if (state === "grace") return 2;
  return 3;
}

function roomKindPriority(kind: GroupNowRoomKind) {
  return kind === "temporary" ? 0 : 1;
}

function toParticipant(
  input: GroupNowParticipantInput,
  viewerId: string,
): GroupNowParticipant {
  return {
    ...input.user,
    isMe: input.user.id === viewerId,
    micMuted: input.micMuted,
    cameraEnabled: input.cameraEnabled,
    screenSharing: input.screenSharing,
  };
}

export function buildGroupNowView(input: BuildGroupNowViewInput): GroupNowView {
  const lobby = input.rooms.find((room) => room.kind === "lobby");
  if (!lobby) {
    throw new Error("У группы нет активного Лобби");
  }

  const latestSessionByRoom = new Map<string, GroupNowSessionInput>();
  for (const session of [...input.sessions].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt))) {
    if (!latestSessionByRoom.has(session.roomId)) {
      latestSessionByRoom.set(session.roomId, session);
    }
  }
  const selectedSessionIds = new Set(
    [...latestSessionByRoom.values()].map((session) => session.id),
  );

  const participantsBySession = new Map<string, GroupNowParticipant[]>();
  const placedUserIds = new Set<string>();
  for (const participant of input.participants) {
    if (!selectedSessionIds.has(participant.sessionId)) continue;
    if (placedUserIds.has(participant.user.id)) continue;
    const participants = participantsBySession.get(participant.sessionId) ?? [];
    participants.push(toParticipant(participant, input.viewerId));
    participantsBySession.set(participant.sessionId, participants);
    placedUserIds.add(participant.user.id);
  }

  const rooms: GroupNowRoom[] = input.rooms.map((room) => {
    const session = latestSessionByRoom.get(room.id);
    const participants = session
      ? participantsBySession.get(session.id) ?? []
      : [];
    return {
      id: room.id,
      kind: room.kind,
      name: room.name,
      joinTarget: { kind: "room", roomId: room.id },
      state: session?.status ?? "idle",
      liveSessionId: session?.id ?? null,
      startedAt: session?.startedAt ?? null,
      startedBy: session?.startedBy ?? null,
      participantCount: participants.length,
      hasScreenShare: participants.some((participant) => participant.screenSharing),
      participants,
    };
  });

  const roomById = new Map(rooms.map((room) => [room.id, room]));
  for (const legacy of input.legacyPresence) {
    if (placedUserIds.has(legacy.user.id)) continue;
    const roomId = legacy.chatId === input.groupId
      ? lobby.id
      : `legacy:${legacy.chatId}`;
    let room = roomById.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        kind: "temporary",
        name: legacy.roomName,
        joinTarget: { kind: "legacy", chatId: legacy.chatId },
        state: "active",
        liveSessionId: null,
        startedAt: null,
        startedBy: null,
        participantCount: 0,
        hasScreenShare: false,
        participants: [],
      };
      rooms.push(room);
      roomById.set(roomId, room);
    }
    room.participants.push({
      ...legacy.user,
      isMe: legacy.user.id === input.viewerId,
      micMuted: null,
      cameraEnabled: null,
      screenSharing: null,
    });
    room.participantCount = room.participants.length;
    placedUserIds.add(legacy.user.id);
  }

  const roomCreatedAt = new Map(
    input.rooms.map((room) => [room.id, room.createdAt]),
  );
  rooms.sort((left, right) => {
    const lobbyOrder = Number(right.kind === "lobby") - Number(left.kind === "lobby");
    return lobbyOrder
    || roomStatePriority(left.state) - roomStatePriority(right.state)
    || roomKindPriority(left.kind) - roomKindPriority(right.kind)
    || (roomCreatedAt.get(left.id) ?? "").localeCompare(
      roomCreatedAt.get(right.id) ?? "",
    )
    || left.name.localeCompare(right.name, "ru");
  });

  const onlineOutsideRooms = input.onlineUsers.filter(
    (user) => !placedUserIds.has(user.id),
  );
  const currentUserRoom = rooms.find((room) =>
    room.participants.some((participant) => participant.id === input.viewerId));

  return {
    groupId: input.groupId,
    groupName: input.groupName,
    rooms,
    onlineOutsideRooms,
    visibleOnlineCount: new Set([
      ...placedUserIds,
      ...input.onlineUsers.map((user) => user.id),
    ]).size,
    currentUserRoomId: currentUserRoom?.id ?? null,
  };
}
