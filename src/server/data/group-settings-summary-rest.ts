import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getChatMembershipRest } from "@/server/data/chat-access-rest";
import { loadGroupCommunitySummariesRest } from "@/server/data/chat-community-rest";

/** Settings identity and access only; opening settings must not observe messages. */
export async function getGroupSettingsSummaryRest(chatId: string, userId: string) {
  const membership = await getChatMembershipRest(chatId, userId);
  if (membership.type !== "group" || membership.parentChatId) {
    throw new Error("Настройки доступны только для основной группы");
  }
  const admin = getAdminClient();
  const [{ data: chat, error }, { count, error: countError }, communities] = await Promise.all([
    admin.from("chats").select("topics_enabled, topics_layout").eq("id", chatId).single(),
    admin.from("chat_members").select("user_id", { count: "exact", head: true }).eq("chat_id", chatId),
    loadGroupCommunitySummariesRest([chatId], userId),
  ]);
  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);
  const community = communities.get(chatId);
  return {
    chatId,
    name: membership.name ?? "Группа",
    viewerRole: membership.role,
    memberCount: count ?? 0,
    topicsEnabled: chat.topics_enabled === true,
    topicsLayout: chat.topics_layout === "tabs" ? "tabs" as const : "list" as const,
    groupVisibility: membership.groupVisibility,
    joinPolicy: membership.joinPolicy,
    groupIcon: community?.icon ?? null,
    groupAvatarUrl: community?.avatarUrl ?? null,
    groupAccentColor: community?.effectiveAccentColor ?? null,
    groupTag: community?.effectiveTag ?? null,
  };
}
