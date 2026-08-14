import { CHAT_REACTION_EMOJIS } from "@/lib/chat/reactions";
import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";

type MessageReactionRow = {
  message_id: string;
  reactor_user_id?: string;
  user_id?: string;
  emoji: string;
  emoji_id?: string | null;
};

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  emojiId?: string | null;
  emojiUrl?: string | null;
  emojiName?: string | null;
};

export async function loadMessageReactionsRest(
  messageIds: string[],
  viewerId: string,
): Promise<Map<string, MessageReactionSummary[]>> {
  if (messageIds.length === 0) return new Map();

  const admin = getAdminClient();
  let { data, error } = await admin
    .from("message_reactions")
    .select("message_id, user_id, emoji, emoji_id")
    .in("message_id", messageIds);

  if (error?.code === "42703" || error?.code === "PGRST204") {
    const legacy = await admin
      .from("message_reactions")
      .select("message_id, user_id, emoji")
      .in("message_id", messageIds);
    data = legacy.data?.map((row) => ({ ...row, emoji_id: null })) ?? null;
    error = legacy.error;
  }

  // Keep chat readable while the reactions migration is rolling out.
  if (error && error.code !== "42P01") throw new Error(error.message);

  const emojiIds = [...new Set(((data ?? []) as MessageReactionRow[]).flatMap((row) => row.emoji_id ? [row.emoji_id] : []))];
  const { data: emojiRows, error: emojiError } = emojiIds.length
    ? await admin.from("group_emojis").select("id, name, storage_key, moderation_status").in("id", emojiIds)
    : { data: [], error: null };
  if (emojiError) throw new Error(emojiError.message);
  const customById = new Map((emojiRows ?? []).map((row) => [row.id as string, row] as const));
  const byMessage = new Map<string, Map<string, MessageReactionSummary>>();
  for (const row of (data ?? []) as MessageReactionRow[]) {
    const userId = row.user_id ?? row.reactor_user_id;
    let groups = byMessage.get(row.message_id);
    if (!groups) {
      groups = new Map();
      byMessage.set(row.message_id, groups);
    }
    const custom = row.emoji_id ? customById.get(row.emoji_id) : null;
    const key = row.emoji_id ? `custom:${row.emoji_id}` : row.emoji;
    const current = groups.get(key) ?? {
      emoji: custom ? `:${String(custom.name)}:` : row.emoji,
      emojiId: row.emoji_id ?? null,
      emojiUrl: custom?.moderation_status === "automated_approved" ? publicAssetUrl(custom.storage_key as string) : null,
      emojiName: custom ? String(custom.name) : null,
      count: 0,
      reactedByMe: false,
    };
    current.count += 1;
    current.reactedByMe ||= userId === viewerId;
    groups.set(key, current);
  }

  return new Map(
    [...byMessage].map(([messageId, groups]) => [
      messageId,
      [...groups.values()].sort(
        (a, b) =>
          (a.emojiId ? CHAT_REACTION_EMOJIS.length : CHAT_REACTION_EMOJIS.indexOf(
            a.emoji as (typeof CHAT_REACTION_EMOJIS)[number],
          )) -
          (b.emojiId ? CHAT_REACTION_EMOJIS.length : CHAT_REACTION_EMOJIS.indexOf(
            b.emoji as (typeof CHAT_REACTION_EMOJIS)[number],
          )),
      ),
    ]),
  );
}
