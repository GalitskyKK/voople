import { publicAssetUrl } from "@/lib/object-storage";
import { getAdminClient } from "@/lib/supabase/admin";
import type { PublicGroupSearchHit } from "@/types/chat";

export async function listPublicGroupsRest(
  userId: string,
  query: string,
): Promise<PublicGroupSearchHit[]> {
  const cleanQuery = query.trim().replace(/^@/, "").replace(/[%(),]/g, "");
  if (cleanQuery.length < 2) return [];

  const admin = getAdminClient();
  const { data: groupsByName, error: groupsError } = await admin
    .from("chats")
    .select("id, name")
    .eq("type", "group")
    .is("parent_chat_id", null)
    .eq("group_visibility", "public")
    .ilike("name", `%${cleanQuery}%`)
    .order("created_at", { ascending: false })
    .limit(20);
  if (groupsError) throw new Error(groupsError.message);

  const slugQuery = cleanQuery.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const { data: slugRows, error: slugError } = slugQuery
    ? await admin
        .from("group_customization")
        .select("chat_id, public_slug")
        .ilike("public_slug", `%${slugQuery}%`)
        .limit(20)
    : { data: [], error: null };
  if (slugError) throw new Error(slugError.message);

  const slugChatIds = (slugRows ?? []).map((row) => row.chat_id as string);
  const { data: groupsBySlug, error: slugGroupsError } = slugChatIds.length
    ? await admin
        .from("chats")
        .select("id, name")
        .in("id", slugChatIds)
        .eq("type", "group")
        .is("parent_chat_id", null)
        .eq("group_visibility", "public")
    : { data: [], error: null };
  if (slugGroupsError) throw new Error(slugGroupsError.message);

  const groups = [
    ...(groupsByName ?? []),
    ...(groupsBySlug ?? []),
  ].filter(
    (group, index, all) =>
      all.findIndex((candidate) => candidate.id === group.id) === index,
  ).slice(0, 20);
  const groupIds = groups.map((group) => group.id as string);
  if (groupIds.length === 0) return [];
  const [membershipsResult, customizationResult] = await Promise.all([
    admin
      .from("chat_members")
      .select("chat_id, user_id")
      .in("chat_id", groupIds),
    admin
      .from("group_customization")
      .select("chat_id, public_slug, icon, avatar_key")
      .in("chat_id", groupIds),
  ]);
  const { data: memberships, error: membershipsError } = membershipsResult;
  if (membershipsError) throw new Error(membershipsError.message);
  if (customizationResult.error) throw new Error(customizationResult.error.message);

  const customizationByChat = new Map(
    (customizationResult.data ?? []).map((row) => [row.chat_id as string, row] as const),
  );

  const counts = new Map<string, number>();
  const joined = new Set<string>();
  for (const membership of memberships ?? []) {
    const chatId = membership.chat_id as string;
    counts.set(chatId, (counts.get(chatId) ?? 0) + 1);
    if (membership.user_id === userId) joined.add(chatId);
  }

  return groups.flatMap((group) =>
    group.name
      ? [{
          id: group.id as string,
          name: group.name as string,
          publicSlug:
            (customizationByChat.get(group.id as string)?.public_slug as string | null | undefined) ?? null,
          icon:
            (customizationByChat.get(group.id as string)?.icon as string | null | undefined) ?? null,
          avatarUrl: publicAssetUrl(
            (customizationByChat.get(group.id as string)?.avatar_key as
              | string
              | null
              | undefined) ?? null,
          ),
          memberCount: counts.get(group.id as string) ?? 0,
          joined: joined.has(group.id as string),
        }]
      : [],
  );
}

export async function joinPublicGroupRest(chatId: string, userId: string) {
  const { data, error } = await getAdminClient().rpc("join_public_group", {
    p_chat_id: chatId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error("Не удалось вступить в группу");
  return { chatId: data };
}
