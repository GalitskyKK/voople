import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { loadGroupCommunitySummariesRest } from "@/server/data/chat-community-rest";
import { loadInviteActivityCountsRest } from "@/server/data/chat-invite-activity-rest";
import type { ChatInvitePreview } from "@/types/chat";

const VANITY_SLUG_PATTERN = /^[a-z0-9_]{5,32}$/;

async function findActiveVanityGroup(slug: string) {
  if (!VANITY_SLUG_PATTERN.test(slug)) return null;
  const { data, error } = await getAdminClient()
    .from("group_customization")
    .select("chat_id, chats!inner(type, name)")
    .eq("vanity_invite_slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const chat = Array.isArray(data.chats) ? data.chats[0] : data.chats;
  const summaries = await loadGroupCommunitySummariesRest([data.chat_id], "");
  const community = summaries.get(data.chat_id);
  if (chat?.type !== "group" || (community?.groupLevel ?? 0) < 24) return null;
  return { chat, community, chatId: data.chat_id as string };
}

export async function previewGroupVanityInviteRest(
  slug: string,
): Promise<ChatInvitePreview | null> {
  const group = await findActiveVanityGroup(slug);
  if (!group) return null;
  const [{ count, error }, activity] = await Promise.all([
    getAdminClient()
      .from("chat_members")
      .select("user_id", { count: "exact", head: true })
      .eq("chat_id", group.chatId),
    loadInviteActivityCountsRest(group.chatId),
  ]);
  if (error) throw new Error(error.message);
  return {
    available: true,
    reason: "active",
    chatId: group.chatId,
    chatName: typeof group.chat.name === "string" ? group.chat.name : "Группа",
    groupIcon: group.community?.icon ?? null,
    groupAvatarUrl: group.community?.avatarUrl ?? null,
    groupBannerUrl: group.community?.effectiveBannerUrl ?? null,
    groupTag: group.community?.effectiveTag ?? null,
    groupAccentColor: group.community?.effectiveAccentColor ?? null,
    memberCount: count ?? 0,
    onlineCount: activity.onlineCount,
    roomParticipantCount: activity.roomParticipantCount,
    expiresAt: null,
  };
}

export async function acceptGroupVanityInviteRest(slug: string, userId: string) {
  if (!(await findActiveVanityGroup(slug))) return null;
  const { data, error } = await getAdminClient().rpc("accept_group_vanity_invite", {
    p_slug: slug,
    p_user_id: userId,
  });
  if (error) {
    if (error.message.includes("Group is full")) throw new Error("В группе уже 20 участников");
    throw new Error("Постоянная ссылка больше не действует");
  }
  if (typeof data !== "string") throw new Error("Не удалось вступить в группу");
  return { chatId: data };
}
