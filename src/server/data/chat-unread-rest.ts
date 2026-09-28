import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

type ChatUnreadCountRow = { chat_id: string; unread_count: number | string };

export async function loadChatUnreadCountsRest(userId: string) {
  const { data, error } = await getAdminClient().rpc("list_chat_unread_counts", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);

  return new Map<string, number>(
    ((data ?? []) as ChatUnreadCountRow[]).map((row) => [
      String(row.chat_id),
      Math.max(0, Number(row.unread_count) || 0),
    ]),
  );
}

export async function markChatReadCursorRest(
  chatId: string,
  userId: string,
  throughAt: string,
) {
  const { data, error } = await getAdminClient().rpc("mark_chat_read_cursor", {
    p_chat_id: chatId,
    p_user_id: userId,
    p_read_through_at: throughAt,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error("Не удалось сохранить позицию чтения");
  return data;
}
