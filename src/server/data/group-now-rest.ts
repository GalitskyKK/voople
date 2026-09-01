import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { mapUserSearchRow, type UserSearchRow } from "@/server/mappers/user-search";
import type { GroupNowUser } from "@/types/group-now";

const USER_CARD_SELECT =
  "id, username, display_name, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)";

export type GroupNowSnapshotRest = {
  rooms: Array<{
    id: string;
    kind: "lobby" | "temporary" | "pinned";
    name: string;
    createdAt: string;
  }>;
  sessions: Array<{
    id: string;
    roomId: string;
    status: "connecting" | "active" | "grace";
    startedAt: string;
    startedBy: string;
  }>;
  participants: Array<{
    sessionId: string;
    userId: string;
    micMuted: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
  }>;
  memberIds: string[];
};

function normalizeRoomKind(value: unknown): "lobby" | "temporary" | "pinned" {
  if (value === "lobby" || value === "temporary" || value === "pinned") {
    return value;
  }
  throw new Error("Обнаружен неизвестный тип комнаты");
}

function normalizeSessionStatus(value: unknown): "connecting" | "active" | "grace" {
  if (value === "connecting" || value === "active" || value === "grace") {
    return value;
  }
  throw new Error("Обнаружено неизвестное состояние комнаты");
}

export async function loadGroupNowSnapshotRest(
  groupId: string,
): Promise<GroupNowSnapshotRest> {
  const admin = getAdminClient();
  const [roomsResult, sessionsResult, membersResult] = await Promise.all([
    admin
      .from("group_rooms")
      .select("id, kind, name, created_at")
      .eq("group_chat_id", groupId)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    admin
      .from("live_sessions")
      .select("id, room_id, status, started_at, started_by")
      .eq("conversation_id", groupId)
      .eq("kind", "group_room")
      .is("ended_at", null)
      .order("started_at", { ascending: false }),
    admin
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", groupId),
  ]);

  if (roomsResult.error) throw new Error(roomsResult.error.message);
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);

  const sessions = (sessionsResult.data ?? []).flatMap((row) => {
    if (!row.room_id) return [];
    return [{
      id: String(row.id),
      roomId: String(row.room_id),
      status: normalizeSessionStatus(row.status),
      startedAt: String(row.started_at),
      startedBy: String(row.started_by),
    }];
  });
  const sessionIds = sessions.map((session) => session.id);
  const participantsResult = sessionIds.length
    ? await admin
        .from("live_session_participants")
        .select("session_id, user_id, mic_muted, camera_enabled, screen_sharing, joined_at")
        .in("session_id", sessionIds)
        .is("left_at", null)
        .order("joined_at", { ascending: true })
    : { data: [], error: null };
  if (participantsResult.error) throw new Error(participantsResult.error.message);

  return {
    rooms: (roomsResult.data ?? []).map((row) => ({
      id: String(row.id),
      kind: normalizeRoomKind(row.kind),
      name: String(row.name),
      createdAt: String(row.created_at),
    })),
    sessions,
    participants: (participantsResult.data ?? []).map((row) => ({
      sessionId: String(row.session_id),
      userId: String(row.user_id),
      micMuted: row.mic_muted === true,
      cameraEnabled: row.camera_enabled === true,
      screenSharing: row.screen_sharing === true,
    })),
    memberIds: (membersResult.data ?? []).map((row) => String(row.user_id)),
  };
}

export async function loadGroupNowUsersRest(
  userIds: string[],
): Promise<Map<string, GroupNowUser>> {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return new Map();

  const { data, error } = await getAdminClient()
    .from("users")
    .select(USER_CARD_SELECT)
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((row) => {
    const user = mapUserSearchRow(row as UserSearchRow);
    return [user.id, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    } satisfies GroupNowUser] as const;
  }));
}
