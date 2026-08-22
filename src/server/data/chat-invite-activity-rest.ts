import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

const ONLINE_AFTER_MS = 5 * 60_000;
const ROOM_AFTER_MS = 3 * 60_000;

export async function loadInviteActivityCountsRest(chatId: string) {
  const admin = getAdminClient();
  const [{ data: members, error: membersError }, { data: chats, error: chatsError }] = await Promise.all([
    admin.from("chat_members").select("user_id").eq("chat_id", chatId),
    admin.from("chats").select("id").or(`id.eq.${chatId},parent_chat_id.eq.${chatId}`),
  ]);
  if (membersError) throw new Error(membersError.message);
  if (chatsError) throw new Error(chatsError.message);

  const memberIds = (members ?? []).map((row) => String(row.user_id));
  const chatIds = (chats ?? []).map((row) => String(row.id));
  const [{ count: onlineCount, error: onlineError }, { data: roomRows, error: roomError }] = await Promise.all([
    memberIds.length
      ? admin
          .from("users")
          .select("id", { count: "exact", head: true })
          .in("id", memberIds)
          .eq("show_online_status", true)
          .gte("last_seen_at", new Date(Date.now() - ONLINE_AFTER_MS).toISOString())
      : Promise.resolve({ count: 0, error: null }),
    chatIds.length
      ? admin
          .from("chat_room_participants")
          .select("user_id")
          .in("chat_id", chatIds)
          .gte("last_seen_at", new Date(Date.now() - ROOM_AFTER_MS).toISOString())
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (onlineError) throw new Error(onlineError.message);
  if (roomError) throw new Error(roomError.message);

  return {
    onlineCount: onlineCount ?? 0,
    roomParticipantCount: new Set((roomRows ?? []).map((row) => String(row.user_id))).size,
  };
}
