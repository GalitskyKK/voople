import { getAdminClient } from "@/lib/supabase/admin";
import { loadGroupCommunitySummariesRest } from "@/server/data/chat-community-rest";
import type { ProfileViewModel } from "@/types/domain";

export async function getProfileGroupTagRest(
  userId: string,
): Promise<NonNullable<ProfileViewModel["groupTag"]> | null> {
  const admin = getAdminClient();
  const { data: selection, error: selectionError } = await admin
    .from("user_group_profile_tags")
    .select("chat_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selectionError) throw new Error(selectionError.message);
  const chatId = selection?.chat_id as string | undefined;
  if (!chatId) return null;

  const [{ data: chat, error: chatError }, summaries] = await Promise.all([
    admin.from("chats").select("name").eq("id", chatId).maybeSingle(),
    loadGroupCommunitySummariesRest([chatId]),
  ]);
  if (chatError) throw new Error(chatError.message);
  const community = summaries.get(chatId);
  if (!chat || !community?.effectiveTag) return null;
  return {
    chatId,
    tag: community.effectiveTag,
    groupName: (chat.name as string | null | undefined) || "Сообщество",
    accentColor: community.effectiveAccentColor,
  };
}
