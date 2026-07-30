import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { DIRECT_CALL_RING_MS } from "@/server/data/chat-rooms-rest";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";
import type { IncomingCallView } from "@/types/chat";

const CALLER_STALE_AFTER_MS = 3 * 60_000;

async function assertDirectMembership(chatId: string, userId: string) {
  const { data, error } = await getAdminClient()
    .from("chat_members")
    .select("chats!inner(type)")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const chat = Array.isArray(data?.chats) ? data.chats[0] : data?.chats;
  if (!data || chat?.type !== "direct") {
    throw new Error("Личный звонок недоступен");
  }
}

export async function declineChatRoomCallRest(chatId: string, userId: string) {
  await assertDirectMembership(chatId, userId);
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("chat_rooms")
    .update({ status: "declined", ended_at: now, updated_at: now })
    .eq("chat_id", chatId)
    .eq("status", "ringing")
    .neq("started_by", userId)
    .select("chat_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Звонок уже завершён");

  const { error: participantsError } = await admin
    .from("chat_room_participants")
    .delete()
    .eq("chat_id", chatId);
  if (participantsError) throw new Error(participantsError.message);
  return { ok: true as const };
}

export async function listIncomingCallsRest(
  userId: string,
): Promise<IncomingCallView[]> {
  const admin = getAdminClient();
  const { data: memberships, error: membershipError } = await admin
    .from("chat_members")
    .select("chat_id")
    .eq("user_id", userId);
  if (membershipError) throw new Error(membershipError.message);
  const chatIds = (memberships ?? []).map((row) => row.chat_id as string);
  if (!chatIds.length) return [];

  const { data: directChats, error: chatsError } = await admin
    .from("chats")
    .select("id")
    .in("id", chatIds)
    .eq("type", "direct");
  if (chatsError) throw new Error(chatsError.message);
  const directChatIds = (directChats ?? []).map((chat) => chat.id as string);
  if (!directChatIds.length) return [];

  const ringCutoff = new Date(Date.now() - DIRECT_CALL_RING_MS).toISOString();
  const { data: rooms, error: roomsError } = await admin
    .from("chat_rooms")
    .select("chat_id, started_by, started_at")
    .in("chat_id", directChatIds)
    .eq("status", "ringing")
    .neq("started_by", userId)
    .gte("started_at", ringCutoff)
    .order("started_at", { ascending: false });
  if (roomsError) throw new Error(roomsError.message);
  if (!rooms?.length) return [];

  const roomIds = rooms.map((room) => room.chat_id as string);
  const callerIds = [...new Set(rooms.map((room) => room.started_by as string))];
  const [participantsResult, callersResult] = await Promise.all([
    admin
      .from("chat_room_participants")
      .select("chat_id, user_id")
      .in("chat_id", roomIds)
      .in("user_id", callerIds)
      .gte(
        "last_seen_at",
        new Date(Date.now() - CALLER_STALE_AFTER_MS).toISOString(),
      ),
    admin
      .from("users")
      .select("id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id)")
      .in("id", callerIds),
  ]);
  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (callersResult.error) throw new Error(callersResult.error.message);

  const liveCallers = new Set(
    (participantsResult.data ?? []).map(
      (participant) => `${participant.chat_id}:${participant.user_id}`,
    ),
  );
  const callersById = new Map(
    (callersResult.data ?? []).map((caller) => {
      const relation = caller.profile_customization as
        | CustomizationRow
        | CustomizationRow[]
        | null;
      const customization = toProfileCustomizationView(
        Array.isArray(relation) ? relation[0] : relation,
      );
      return [caller.id as string, {
        id: caller.id as string,
        username: caller.username as string,
        displayName: caller.display_name as string,
        avatarUrl: customization.assets.animatedAvatarUrl ?? null,
        avatarDecorationUrl:
          customization.assets.avatarDecorationUrl ?? null,
        avatarRingId: customization.avatarRingId ?? null,
      }] as const;
    }),
  );

  return rooms.flatMap((room) => {
    const callerId = room.started_by as string;
    const caller = callersById.get(callerId);
    if (!caller || !liveCallers.has(`${room.chat_id}:${callerId}`)) return [];
    return [{
      chatId: room.chat_id as string,
      chatName: caller.displayName,
      chatType: "direct" as const,
      startedAt: room.started_at as string,
      caller,
    }];
  });
}
