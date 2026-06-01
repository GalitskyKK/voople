import { getAdminClient } from "@/lib/supabase/admin";

export const PROFILE_REACTION_EMOJIS = ["❤️", "✨", "🔥"] as const;
export type ProfileReactionEmoji = (typeof PROFILE_REACTION_EMOJIS)[number];

export type ProfileReactionSummary = {
  emoji: ProfileReactionEmoji;
  count: number;
  reactedByViewer: boolean;
};

function assertProfileReactionEmoji(emoji: string): asserts emoji is ProfileReactionEmoji {
  if (!PROFILE_REACTION_EMOJIS.includes(emoji as ProfileReactionEmoji)) {
    throw new Error("Недоступная реакция");
  }
}

export async function listProfileReactionsRest(
  profileUserId: string,
  viewerId?: string | null,
): Promise<ProfileReactionSummary[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("card_reactions")
    .select("emoji, reactor_user_id")
    .eq("profile_user_id", profileUserId)
    .in("emoji", [...PROFILE_REACTION_EMOJIS]);

  if (error) throw new Error(error.message);

  return PROFILE_REACTION_EMOJIS.map((emoji) => {
    const rows = (data ?? []).filter((row) => row.emoji === emoji);
    return {
      emoji,
      count: rows.length,
      reactedByViewer: viewerId
        ? rows.some((row) => row.reactor_user_id === viewerId)
        : false,
    };
  });
}

export async function toggleProfileReactionRest(
  profileUserId: string,
  reactorUserId: string,
  emoji: string,
) {
  assertProfileReactionEmoji(emoji);

  if (profileUserId === reactorUserId) {
    throw new Error("Нельзя реагировать на свой профиль");
  }

  const admin = getAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("card_reactions")
    .select("emoji")
    .eq("profile_user_id", profileUserId)
    .eq("reactor_user_id", reactorUserId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error } = await admin
      .from("card_reactions")
      .delete()
      .eq("profile_user_id", profileUserId)
      .eq("reactor_user_id", reactorUserId)
      .eq("emoji", emoji);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("card_reactions").insert({
      profile_user_id: profileUserId,
      reactor_user_id: reactorUserId,
      emoji,
    });
    if (error) throw new Error(error.message);
  }

  return listProfileReactionsRest(profileUserId, reactorUserId);
}
