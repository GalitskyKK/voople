import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import { getAdminClient } from "@/lib/supabase/admin";

type MessageReactionRow = {
  message_id: string;
  reactor_user_id?: string;
  user_id?: string;
  emoji: string;
};

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export async function loadMessageReactionsRest(
  messageIds: string[],
  viewerId: string,
): Promise<Map<string, MessageReactionSummary[]>> {
  if (messageIds.length === 0) return new Map();

  const { data, error } = await getAdminClient()
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds);

  // Keep chat readable while the reactions migration is rolling out.
  if (error && error.code !== "42P01") throw new Error(error.message);

  const byMessage = new Map<string, Map<string, MessageReactionSummary>>();
  for (const row of (data ?? []) as MessageReactionRow[]) {
    const userId = row.user_id ?? row.reactor_user_id;
    let groups = byMessage.get(row.message_id);
    if (!groups) {
      groups = new Map();
      byMessage.set(row.message_id, groups);
    }
    const current = groups.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      reactedByMe: false,
    };
    current.count += 1;
    current.reactedByMe ||= userId === viewerId;
    groups.set(row.emoji, current);
  }

  return new Map(
    [...byMessage].map(([messageId, groups]) => [
      messageId,
      [...groups.values()].sort(
        (a, b) =>
          CHAT_REACTION_EMOJIS.indexOf(
            a.emoji as (typeof CHAT_REACTION_EMOJIS)[number],
          ) -
          CHAT_REACTION_EMOJIS.indexOf(
            b.emoji as (typeof CHAT_REACTION_EMOJIS)[number],
          ),
      ),
    ]),
  );
}
