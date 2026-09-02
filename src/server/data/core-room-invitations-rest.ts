import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { loadGroupNowUsersRest } from "@/server/data/group-now-rest";
import { filterUserIdsByPrivacyFieldRest } from "@/server/data/privacy-rest";
import type { GroupNowRoom } from "@/types/group-now";
import type {
  CoreRoomInvitePreview,
  CoreRoomInviteStatus,
} from "@/types/room-invitations";

const ACTIVE_SESSION_STATES = ["connecting", "active", "grace"];
const INVITE_TTL_MS = 15 * 60_000;

type InviteSessionContext = {
  sessionId: string;
  groupId: string;
  roomId: string;
  roomName: string;
  roomKind: "lobby" | "temporary" | "pinned";
  participantIds: string[];
};

function inviteStatus(value: unknown): CoreRoomInviteStatus {
  if (
    value === "pending" || value === "accepted" || value === "declined"
    || value === "expired" || value === "cancelled"
  ) return value;
  return "expired";
}

function roomKind(value: unknown): "lobby" | "temporary" | "pinned" {
  if (value === "lobby" || value === "temporary" || value === "pinned") return value;
  throw new Error("Комната больше недоступна");
}

export async function getCoreRoomInviteSessionRest(
  sessionId: string,
  actorId: string,
): Promise<InviteSessionContext> {
  const admin = getAdminClient();
  const [sessionResult, actorResult, participantsResult] = await Promise.all([
    admin
      .from("live_sessions")
      .select("id, conversation_id, room_id, status, ended_at")
      .eq("id", sessionId)
      .eq("kind", "group_room")
      .in("status", ACTIVE_SESSION_STATES)
      .is("ended_at", null)
      .maybeSingle(),
    admin
      .from("live_session_participants")
      .select("session_id")
      .eq("session_id", sessionId)
      .eq("user_id", actorId)
      .is("left_at", null)
      .maybeSingle(),
    admin
      .from("live_session_participants")
      .select("user_id")
      .eq("session_id", sessionId)
      .is("left_at", null),
  ]);
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  if (!sessionResult.data?.room_id) throw new Error("Сессия комнаты завершена");
  if (actorResult.error) throw new Error(actorResult.error.message);
  if (!actorResult.data) throw new Error("Приглашать может только участник комнаты");
  if (participantsResult.error) throw new Error(participantsResult.error.message);

  const roomResult = await admin
    .from("group_rooms")
    .select("id, group_chat_id, name, kind")
    .eq("id", sessionResult.data.room_id)
    .is("archived_at", null)
    .maybeSingle();
  if (roomResult.error) throw new Error(roomResult.error.message);
  if (!roomResult.data || roomResult.data.group_chat_id !== sessionResult.data.conversation_id) {
    throw new Error("Комната больше недоступна");
  }

  return {
    sessionId,
    groupId: String(sessionResult.data.conversation_id),
    roomId: String(roomResult.data.id),
    roomName: String(roomResult.data.name),
    roomKind: roomKind(roomResult.data.kind),
    participantIds: (participantsResult.data ?? []).map((row) => String(row.user_id)),
  };
}

export async function upsertCoreRoomInviteRest(input: {
  context: InviteSessionContext;
  inviterId: string;
  inviteeId: string;
}) {
  const admin = getAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  const { data, error } = await admin
    .from("chat_room_invites")
    .upsert({
      chat_id: input.context.groupId,
      room_session_id: input.context.sessionId,
      inviter_id: input.inviterId,
      invitee_id: input.inviteeId,
      status: "pending",
      expires_at: expiresAt,
      responded_at: null,
      updated_at: now.toISOString(),
    }, { onConflict: "chat_id,room_session_id,invitee_id" })
    .select("id, expires_at")
    .single();
  if (error) throw new Error(error.message);

  const existingNotification = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", input.inviteeId)
    .eq("type", "room_invite")
    .eq("reference_id", data.id)
    .maybeSingle();
  if (existingNotification.error) throw new Error(existingNotification.error.message);
  const notificationResult = existingNotification.data
    ? await admin.from("notifications").update({
        actor_id: input.inviterId,
        read: false,
        created_at: now.toISOString(),
      }).eq("id", existingNotification.data.id)
    : await admin.from("notifications").insert({
        user_id: input.inviteeId,
        type: "room_invite",
        actor_id: input.inviterId,
        reference_id: data.id,
      });
  if (notificationResult.error) throw new Error(notificationResult.error.message);
  return { id: String(data.id), expiresAt: String(data.expires_at) };
}

export async function listCoreRoomInvitesForSenderRest(
  context: InviteSessionContext,
  inviterId: string,
) {
  const admin = getAdminClient();
  const result = await admin
    .from("chat_room_invites")
    .select("id, invitee_id, status, expires_at")
    .eq("chat_id", context.groupId)
    .eq("room_session_id", context.sessionId)
    .eq("inviter_id", inviterId);
  if (result.error) throw new Error(result.error.message);
  const now = Date.now();
  const expiredIds = (result.data ?? []).flatMap((row) =>
    inviteStatus(row.status) === "pending" && new Date(row.expires_at).getTime() <= now
      ? [String(row.id)]
      : [],
  );
  if (expiredIds.length) {
    const expiredResult = await admin.from("chat_room_invites").update({
      status: "expired",
      updated_at: new Date(now).toISOString(),
    }).in("id", expiredIds).eq("status", "pending");
    if (expiredResult.error) throw new Error(expiredResult.error.message);
  }
  return new Map((result.data ?? []).map((row) => {
    const storedStatus = inviteStatus(row.status);
    const status = storedStatus === "pending" && expiredIds.includes(String(row.id))
      ? "expired"
      : storedStatus;
    return [String(row.invitee_id), {
      id: String(row.id),
      status,
      expiresAt: String(row.expires_at),
    }] as const;
  }));
}

export async function getCoreRoomInviteGroupForSenderRest(
  inviteId: string,
  inviterId: string,
) {
  const result = await getAdminClient()
    .from("chat_room_invites")
    .select("chat_id")
    .eq("id", inviteId)
    .eq("inviter_id", inviterId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("Приглашение недоступно");
  return String(result.data.chat_id);
}

export async function cancelCoreRoomInviteRest(input: {
  inviteId: string;
  inviterId: string;
}) {
  const admin = getAdminClient();
  const signalNotificationUpdate = async () => {
    // Preserve the notification while emitting its realtime UPDATE for the invitee.
    const result = await admin.from("notifications").update({
      actor_id: input.inviterId,
    })
      .eq("type", "room_invite")
      .eq("reference_id", input.inviteId);
    if (result.error) throw new Error(result.error.message);
  };
  const inviteResult = await admin
    .from("chat_room_invites")
    .select("id, chat_id, room_session_id, status, expires_at")
    .eq("id", input.inviteId)
    .eq("inviter_id", input.inviterId)
    .maybeSingle();
  if (inviteResult.error) throw new Error(inviteResult.error.message);
  if (!inviteResult.data) throw new Error("Приглашение недоступно");
  const currentStatus = inviteStatus(inviteResult.data.status);
  if (currentStatus === "cancelled") {
    await signalNotificationUpdate();
    return { status: currentStatus };
  }
  if (currentStatus !== "pending") throw new Error("Это приглашение уже нельзя отменить");
  if (new Date(inviteResult.data.expires_at).getTime() <= Date.now()) {
    const expiredResult = await admin.from("chat_room_invites").update({
      status: "expired",
      updated_at: new Date().toISOString(),
    }).eq("id", input.inviteId).eq("status", "pending");
    if (expiredResult.error) throw new Error(expiredResult.error.message);
    await signalNotificationUpdate();
    return { status: "expired" as const };
  }
  const context = await getCoreRoomInviteSessionRest(
    String(inviteResult.data.room_session_id),
    input.inviterId,
  );
  if (context.groupId !== String(inviteResult.data.chat_id)) {
    throw new Error("Приглашение не относится к текущей комнате");
  }
  const updatedAt = new Date().toISOString();
  const updateResult = await admin.from("chat_room_invites").update({
    status: "cancelled",
    updated_at: updatedAt,
  })
    .eq("id", input.inviteId)
    .eq("inviter_id", input.inviterId)
    .eq("status", "pending")
    .select("status")
    .maybeSingle();
  if (updateResult.error) throw new Error(updateResult.error.message);
  if (!updateResult.data) {
    const latestResult = await admin
      .from("chat_room_invites")
      .select("status")
      .eq("id", input.inviteId)
      .eq("inviter_id", input.inviterId)
      .maybeSingle();
    if (latestResult.error) throw new Error(latestResult.error.message);
    if (!latestResult.data || inviteStatus(latestResult.data.status) !== "cancelled") {
      throw new Error("Это приглашение уже нельзя отменить");
    }
  }
  await signalNotificationUpdate();
  return { status: "cancelled" as const };
}

export async function respondToCoreRoomInviteRest(input: {
  inviteId: string;
  userId: string;
  response: "accepted" | "declined";
}) {
  const admin = getAdminClient();
  const inviteResult = await admin
    .from("chat_room_invites")
    .select("id, room_session_id, status, expires_at")
    .eq("id", input.inviteId)
    .eq("invitee_id", input.userId)
    .maybeSingle();
  if (inviteResult.error) throw new Error(inviteResult.error.message);
  if (!inviteResult.data) throw new Error("Приглашение недоступно");
  const currentStatus = inviteStatus(inviteResult.data.status);
  if (currentStatus === input.response) return { status: currentStatus };
  if (currentStatus !== "pending") throw new Error("На приглашение уже ответили");
  if (new Date(inviteResult.data.expires_at).getTime() <= Date.now()) {
    await admin.from("chat_room_invites").update({
      status: "expired",
      updated_at: new Date().toISOString(),
    }).eq("id", input.inviteId).eq("status", "pending");
    throw new Error("Срок приглашения истёк");
  }
  if (input.response === "accepted") {
    const participantResult = await admin
      .from("live_session_participants")
      .select("session_id")
      .eq("session_id", inviteResult.data.room_session_id)
      .eq("user_id", input.userId)
      .is("left_at", null)
      .maybeSingle();
    if (participantResult.error) throw new Error(participantResult.error.message);
    if (!participantResult.data) throw new Error("Сначала войдите в приглашённую комнату");
  }
  const respondedAt = new Date().toISOString();
  const updateResult = await admin.from("chat_room_invites").update({
    status: input.response,
    responded_at: respondedAt,
    updated_at: respondedAt,
  })
    .eq("id", input.inviteId)
    .eq("invitee_id", input.userId)
    .eq("status", "pending")
    .select("status")
    .maybeSingle();
  if (updateResult.error) throw new Error(updateResult.error.message);
  if (!updateResult.data) {
    const latestResult = await admin
      .from("chat_room_invites")
      .select("status")
      .eq("id", input.inviteId)
      .eq("invitee_id", input.userId)
      .maybeSingle();
    if (latestResult.error) throw new Error(latestResult.error.message);
    const latestStatus = latestResult.data ? inviteStatus(latestResult.data.status) : null;
    if (latestStatus === input.response) return { status: latestStatus };
    throw new Error("На приглашение уже ответили");
  }
  return { status: input.response };
}

export async function listCoreRoomInvitePreviewsRest(
  inviteIds: string[],
  userId: string,
): Promise<Map<string, CoreRoomInvitePreview>> {
  const uniqueIds = [...new Set(inviteIds)];
  if (!uniqueIds.length) return new Map();
  const admin = getAdminClient();
  const inviteResult = await admin
    .from("chat_room_invites")
    .select("id, chat_id, room_session_id, status, expires_at")
    .in("id", uniqueIds)
    .eq("invitee_id", userId);
  if (inviteResult.error) throw new Error(inviteResult.error.message);
  const invites = inviteResult.data ?? [];
  const sessionIds = invites.map((row) => String(row.room_session_id));
  const sessionResult = await admin
    .from("live_sessions")
    .select("id, conversation_id, room_id, status, started_at, started_by, ended_at")
    .in("id", sessionIds)
    .eq("kind", "group_room");
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  const sessions = new Map((sessionResult.data ?? []).map((row) => [String(row.id), row]));
  const roomIds = (sessionResult.data ?? []).flatMap((row) => row.room_id ? [String(row.room_id)] : []);
  const [roomResult, participantResult] = await Promise.all([
    roomIds.length
      ? admin.from("group_rooms").select("id, group_chat_id, name, kind, archived_at").in("id", roomIds)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length
      ? admin.from("live_session_participants").select("session_id, user_id, mic_muted, camera_enabled, screen_sharing").in("session_id", sessionIds).is("left_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (roomResult.error) throw new Error(roomResult.error.message);
  if (participantResult.error) throw new Error(participantResult.error.message);
  const rooms = new Map((roomResult.data ?? []).map((row) => [String(row.id), row]));
  const participantIds = (participantResult.data ?? []).map((row) => String(row.user_id));
  const visibleIds = new Set(await filterUserIdsByPrivacyFieldRest(participantIds, userId, "roomsScope"));
  const users = await loadGroupNowUsersRest([...visibleIds]);
  const now = Date.now();

  return new Map(invites.map((invite) => {
    const session = sessions.get(String(invite.room_session_id));
    const roomRecord = session?.room_id ? rooms.get(String(session.room_id)) : null;
    const active = Boolean(
      session && roomRecord && !roomRecord.archived_at && !session.ended_at
      && ACTIVE_SESSION_STATES.includes(String(session.status))
      && String(session.conversation_id) === String(invite.chat_id)
      && String(roomRecord.group_chat_id) === String(invite.chat_id),
    );
    const storedStatus = inviteStatus(invite.status);
    const status = storedStatus === "pending"
      && (new Date(invite.expires_at).getTime() <= now || !active)
      ? "expired"
      : storedStatus;
    let room: GroupNowRoom | null = null;
    if (active && roomRecord && session) {
      const participants = (participantResult.data ?? []).flatMap((participant) => {
        if (String(participant.session_id) !== String(session.id)) return [];
        const participantId = String(participant.user_id);
        const user = users.get(participantId);
        if (!user || !visibleIds.has(participantId)) return [];
        return [{
          ...user,
          isMe: participantId === userId,
          micMuted: participant.mic_muted === true,
          cameraEnabled: participant.camera_enabled === true,
          screenSharing: participant.screen_sharing === true,
        }];
      });
      room = {
        id: String(roomRecord.id),
        kind: roomKind(roomRecord.kind),
        name: String(roomRecord.name),
        joinTarget: { kind: "room", roomId: String(roomRecord.id) },
        state: String(session.status) as "connecting" | "active" | "grace",
        liveSessionId: String(session.id),
        startedAt: String(session.started_at),
        startedBy: session.started_by ? String(session.started_by) : null,
        participantCount: participants.length,
        hasScreenShare: participants.some((participant) => participant.screenSharing),
        participants,
      };
    }
    return [String(invite.id), {
      id: String(invite.id),
      status,
      expiresAt: String(invite.expires_at),
      groupId: active ? String(invite.chat_id) : null,
      room,
    } satisfies CoreRoomInvitePreview] as const;
  }));
}
