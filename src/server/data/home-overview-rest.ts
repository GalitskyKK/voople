import { getAdminClient } from "@/lib/supabase/admin";

const ACTIVE_PARTICIPANT_WINDOW_MS = 3 * 60_000;

export async function getActiveRoomCountsRest(chatIds: string[]) {
  if (!chatIds.length) return new Map<string, number>();
  const activeAfter = new Date(Date.now() - ACTIVE_PARTICIPANT_WINDOW_MS).toISOString();
  const { data, error } = await getAdminClient()
    .from("chat_room_participants")
    .select("chat_id")
    .in("chat_id", chatIds)
    .gte("last_seen_at", activeAfter);
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const chatId = row.chat_id as string;
    counts.set(chatId, (counts.get(chatId) ?? 0) + 1);
  }
  return counts;
}
