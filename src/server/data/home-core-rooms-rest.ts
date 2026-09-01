import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { filterUserIdsByPrivacyFieldRest } from "@/server/data/privacy-rest";
import type {
  GroupNowParticipant,
  GroupNowRoom,
  GroupNowRoomState,
  GroupNowRoomTarget,
} from "@/types/group-now";

import { loadGroupNowUsersRest } from "./group-now-rest";

const ACTIVE_PARTICIPANT_WINDOW_MS = 3 * 60_000;

function normalizeCoreRoomState(value: unknown): Exclude<GroupNowRoomState, "idle"> {
  if (value === "connecting" || value === "active" || value === "grace") return value;
  throw new Error("Обнаружено неизвестное состояние комнаты");
}

function normalizeCoreRoomKind(value: unknown): GroupNowRoom["kind"] {
  if (value === "lobby" || value === "temporary" || value === "pinned") return value;
  throw new Error("Обнаружен неизвестный тип комнаты");
}

export async function listActiveCoreRoomsRest(
  groupIds: string[],
  viewerId: string,
): Promise<GroupNowRoomTarget[]> {
  const uniqueGroupIds = [...new Set(groupIds)];
  if (!uniqueGroupIds.length) return [];

  const admin = getAdminClient();
  const sessionsResult = await admin
    .from("live_sessions")
    .select("id, conversation_id, room_id, status, started_at, started_by")
    .in("conversation_id", uniqueGroupIds)
    .eq("kind", "group_room")
    .is("ended_at", null)
    .order("started_at", { ascending: false });
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);

  const sessions = (sessionsResult.data ?? []).flatMap((row) => {
    if (!row.room_id) return [];
    return [{
      id: String(row.id),
      groupId: String(row.conversation_id),
      roomId: String(row.room_id),
      state: normalizeCoreRoomState(row.status),
      startedAt: String(row.started_at),
      startedBy: String(row.started_by),
    }];
  });
  if (!sessions.length) return [];

  const roomIds = [...new Set(sessions.map((session) => session.roomId))];
  const sessionIds = sessions.map((session) => session.id);
  const activeAfter = new Date(Date.now() - ACTIVE_PARTICIPANT_WINDOW_MS).toISOString();
  const [roomsResult, participantsResult] = await Promise.all([
    admin
      .from("group_rooms")
      .select("id, group_chat_id, kind, name")
      .in("id", roomIds)
      .is("archived_at", null),
    admin
      .from("live_session_participants")
      .select("session_id, user_id, mic_muted, camera_enabled, screen_sharing, joined_at")
      .in("session_id", sessionIds)
      .is("left_at", null)
      .gte("last_seen_at", activeAfter)
      .order("joined_at", { ascending: true }),
  ]);
  if (roomsResult.error) throw new Error(roomsResult.error.message);
  if (participantsResult.error) throw new Error(participantsResult.error.message);

  const participantRows = participantsResult.data ?? [];
  const participantUserIds = [...new Set(participantRows.map((row) => String(row.user_id)))];
  if (!participantUserIds.length) return [];

  const membershipsResult = await admin
    .from("chat_members")
    .select("chat_id, user_id")
    .in("chat_id", uniqueGroupIds)
    .in("user_id", participantUserIds);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);

  const memberPairs = new Set((membershipsResult.data ?? []).map(
    (row) => `${String(row.chat_id)}:${String(row.user_id)}`,
  ));
  const visibleParticipantIds = new Set(await filterUserIdsByPrivacyFieldRest(
    participantUserIds,
    viewerId,
    "roomsScope",
  ));
  const users = await loadGroupNowUsersRest([...visibleParticipantIds]);
  const roomById = new Map((roomsResult.data ?? []).map((row) => [String(row.id), {
    groupId: String(row.group_chat_id),
    kind: normalizeCoreRoomKind(row.kind),
    name: String(row.name),
  }] as const));
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const participantsBySession = new Map<string, GroupNowParticipant[]>();

  for (const row of participantRows) {
    const session = sessionById.get(String(row.session_id));
    const userId = String(row.user_id);
    const user = users.get(userId);
    if (
      !session
      || !user
      || !visibleParticipantIds.has(userId)
      || !memberPairs.has(`${session.groupId}:${userId}`)
    ) continue;
    const participants = participantsBySession.get(session.id) ?? [];
    participants.push({
      ...user,
      isMe: userId === viewerId,
      micMuted: row.mic_muted === true,
      cameraEnabled: row.camera_enabled === true,
      screenSharing: row.screen_sharing === true,
    });
    participantsBySession.set(session.id, participants);
  }

  return sessions.flatMap((session): GroupNowRoomTarget[] => {
    const room = roomById.get(session.roomId);
    const participants = participantsBySession.get(session.id) ?? [];
    if (!room || room.groupId !== session.groupId || !participants.length) return [];
    return [{
      groupId: session.groupId,
      room: {
        id: session.roomId,
        kind: room.kind,
        name: room.name,
        joinTarget: { kind: "room", roomId: session.roomId },
        state: session.state,
        liveSessionId: session.id,
        startedAt: session.startedAt,
        startedBy: session.startedBy,
        participantCount: participants.length,
        hasScreenShare: participants.some((participant) => participant.screenSharing),
        participants,
      },
    }];
  });
}
