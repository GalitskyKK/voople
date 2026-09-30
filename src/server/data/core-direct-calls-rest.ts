import "server-only";

import { z } from "zod";

import { getAdminClient } from "@/lib/supabase/admin";
import { filterUnblockedUserIdsRest } from "@/server/data/user-blocks-rest";
import { toProfileCustomizationView, type CustomizationRow } from "@/server/mappers/customization";
import type { ChatRoomView, IncomingCallView } from "@/types/chat";

const startResultSchema = z.object({
  sessionId: z.string().uuid(),
  providerSessionId: z.string().uuid(),
  recipientId: z.string().uuid(),
  status: z.enum(["ringing", "active", "ended"]),
  reused: z.boolean(),
});
const answerResultSchema = startResultSchema.pick({ sessionId: true, providerSessionId: true, status: true });
const finishResultSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.enum(["ended", "declined", "cancelled", "missed"]),
  changed: z.boolean(),
});
const sessionSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  provider_session_id: z.string().uuid(),
  started_by: z.string().uuid(),
  direct_recipient_id: z.string().uuid(),
  status: z.enum(["ringing", "active", "ended"]),
  started_at: z.string(),
  ring_expires_at: z.string(),
  accepted_at: z.string().nullable(),
  terminal_reason: z.enum(["ended", "declined", "cancelled", "missed"]).nullable(),
  ended_at: z.string().nullable(),
});
export type CoreDirectCall = z.infer<typeof sessionSchema>;

function checked<T>(data: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error("Состояние звонка недоступно");
  return parsed.data;
}

async function loadSession(sessionId: string): Promise<CoreDirectCall> {
  const { data, error } = await getAdminClient().from("live_sessions")
    .select("id, conversation_id, provider_session_id, started_by, direct_recipient_id, status, started_at, ring_expires_at, accepted_at, terminal_reason, ended_at")
    .eq("id", sessionId).eq("kind", "direct_call").maybeSingle();
  if (error) throw new Error(error.message);
  return checked(data, sessionSchema);
}

export async function getCoreDirectCallRest(sessionId: string, userId: string) {
  const session = await loadSession(sessionId);
  if (userId !== session.started_by && userId !== session.direct_recipient_id) {
    throw new Error("Звонок недоступен");
  }
  const { data: member, error } = await getAdminClient().from("chat_members")
    .select("user_id").eq("chat_id", session.conversation_id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) throw new Error("Звонок недоступен");
  return session;
}

export async function getActiveCoreDirectCallRest(userId: string) {
  const { data, error } = await getAdminClient().from("live_sessions")
    .select("id")
    .eq("kind", "direct_call").is("ended_at", null)
    .or(`started_by.eq.${userId},direct_recipient_id.eq.${userId}`)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const session = await getCoreDirectCallRest(data.id, userId);
  return { ...session, isCaller: session.started_by === userId };
}

export async function getDirectRecipientForPreviewRest(conversationId: string, callerId: string) {
  const { data, error } = await getAdminClient().from("chat_members")
    .select("user_id").eq("chat_id", conversationId);
  if (error) throw new Error(error.message);
  if (data?.length !== 2 || !data.some((member) => member.user_id === callerId)) {
    throw new Error("Личный звонок недоступен");
  }
  return data.find((member) => member.user_id !== callerId)!.user_id;
}

export async function startCoreDirectCallRest(input: {
  conversationId: string; callerId: string; requestId: string; expectedRecipientId: string;
}) {
  const { data, error } = await getAdminClient().rpc("start_core_direct_call", {
    p_conversation_id: input.conversationId,
    p_caller_id: input.callerId,
    p_request_id: input.requestId,
    p_expected_recipient_id: input.expectedRecipientId,
  });
  if (error) throw new Error(error.message);
  const result = checked(data, startResultSchema);
  const session = await getCoreDirectCallRest(result.sessionId, input.callerId);
  return { ...result, session };
}

export async function answerCoreDirectCallRest(sessionId: string, userId: string) {
  const { data, error } = await getAdminClient().rpc("answer_core_direct_call", {
    p_session_id: sessionId, p_recipient_id: userId,
  });
  if (error) throw new Error(error.message);
  return checked(data, answerResultSchema);
}

export async function finishCoreDirectCallRest(sessionId: string, userId: string) {
  const { data, error } = await getAdminClient().rpc("finish_core_direct_call", {
    p_session_id: sessionId, p_actor_id: userId,
  });
  if (error) throw new Error(error.message);
  const result = checked(data, finishResultSchema);
  return result;
}

export async function expireCoreDirectCallsRest() {
  const { data, error } = await getAdminClient().rpc("expire_core_direct_calls", { p_limit: 100 });
  if (error) throw new Error(error.message);
  return { expired: z.number().int().nonnegative().parse(data) };
}

export async function listCoreIncomingCallsRest(userId: string): Promise<IncomingCallView[]> {
  const admin = getAdminClient();
  const { data: sessions, error } = await admin.from("live_sessions")
    .select("id, conversation_id, started_by, started_at")
    .eq("kind", "direct_call").eq("direct_recipient_id", userId)
    .eq("status", "ringing").is("ended_at", null)
    .gt("ring_expires_at", new Date().toISOString())
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!sessions?.length) return [];
  const { data: memberships, error: membershipError } = await admin.from("chat_members")
    .select("chat_id").eq("user_id", userId)
    .in("chat_id", sessions.map((session) => session.conversation_id));
  if (membershipError) throw new Error(membershipError.message);
  const allowedChats = new Set((memberships ?? []).map((member) => member.chat_id));
  const callerIds = [...new Set(sessions.map((session) => session.started_by as string))];
  const visibleIds = await filterUnblockedUserIdsRest(userId, callerIds);
  if (!visibleIds.length) return [];
  const { data: callers, error: callerError } = await admin.from("users")
    .select("id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id)")
    .in("id", visibleIds);
  if (callerError) throw new Error(callerError.message);
  const byId = new Map((callers ?? []).map((caller) => [caller.id, caller]));
  return sessions.flatMap((session) => {
    if (!allowedChats.has(session.conversation_id)) return [];
    const caller = byId.get(session.started_by);
    if (!caller) return [];
    const relation = caller.profile_customization as CustomizationRow | CustomizationRow[] | null;
    const customization = toProfileCustomizationView(Array.isArray(relation) ? relation[0] : relation);
    return [{
      chatId: session.conversation_id as string,
      chatName: caller.display_name as string,
      chatType: "direct" as const,
      startedAt: session.started_at as string,
      coreSessionId: session.id as string,
      caller: {
        id: caller.id as string,
        username: caller.username as string,
        displayName: caller.display_name as string,
        avatarUrl: customization.assets.animatedAvatarUrl ?? null,
        avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
        avatarRingId: customization.avatarRingId ?? null,
      },
    }];
  });
}

export async function coreDirectCallRoomViewRest(sessionId: string, userId: string): Promise<ChatRoomView> {
  const session = await getCoreDirectCallRest(sessionId, userId);
  const admin = getAdminClient();
  const [{ data: members, error: membersError }, { data: presence, error: presenceError }] = await Promise.all([
    admin.from("users").select("id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id)")
      .in("id", [session.started_by, session.direct_recipient_id]),
    admin.from("live_session_participants").select("user_id, mic_muted")
      .eq("session_id", sessionId).is("left_at", null),
  ]);
  if (membersError) throw new Error(membersError.message);
  if (presenceError) throw new Error(presenceError.message);
  const presenceById = new Map((presence ?? []).map((person) => [person.user_id, person]));
  const participants = (members ?? []).flatMap((member) => {
    const current = presenceById.get(member.id);
    if (!current) return [];
    const relation = member.profile_customization as CustomizationRow | CustomizationRow[] | null;
    const customization = toProfileCustomizationView(Array.isArray(relation) ? relation[0] : relation);
    return [{ id: member.id, username: member.username, displayName: member.display_name,
      avatarUrl: customization.assets.animatedAvatarUrl ?? null,
      avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
      avatarRingId: customization.avatarRingId ?? null,
      micMuted: current.mic_muted, isMe: member.id === userId }];
  });
  return {
    sessionId: session.id,
    status: session.status === "ringing" ? "ringing" : session.status === "active" ? "active" : "empty",
    accessMode: "open", startedBy: session.started_by, startedAt: session.accepted_at ?? session.started_at,
    endReason: session.terminal_reason, participants,
    isInside: presenceById.has(userId),
  };
}
