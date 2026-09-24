import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { loadGroupCommunitySummariesRest } from "@/server/data/chat-community-rest";
import { filterUnblockedUserIdsRest } from "@/server/data/user-blocks-rest";

export async function getProfileCommonGroupsRest(viewerId: string, targetId: string) {
  if (viewerId !== targetId) {
    const allowed = await filterUnblockedUserIdsRest(viewerId, [targetId]);
    if (!allowed.includes(targetId)) return { count: 0, groups: [] };
  }
  const admin = getAdminClient();
  const own = await admin.from("chat_members")
    .select("chat_id").eq("user_id", viewerId).limit(200);
  if (own.error) throw new Error(own.error.message);
  const membershipIds = (own.data ?? []).map((row) => String(row.chat_id));
  if (!membershipIds.length) return { count: 0, groups: [] };
  const ownGroups = await admin.from("chats").select("id")
    .in("id", membershipIds).eq("type", "group").is("parent_chat_id", null);
  if (ownGroups.error) throw new Error(ownGroups.error.message);
  const ownIds = (ownGroups.data ?? []).map((row) => String(row.id));
  if (!ownIds.length) return { count: 0, groups: [] };
  const ids = viewerId === targetId ? ownIds : await (async () => {
    const common = await admin.from("chat_members").select("chat_id")
      .eq("user_id", targetId).in("chat_id", ownIds);
    if (common.error) throw new Error(common.error.message);
    return (common.data ?? []).map((row) => String(row.chat_id));
  })();
  if (!ids.length) return { count: 0, groups: [] };
  const visibleIds = ids.slice(0, 4);
  const [chats, community] = await Promise.all([
    admin.from("chats").select("id, name").in("id", visibleIds),
    loadGroupCommunitySummariesRest(visibleIds),
  ]);
  if (chats.error) throw new Error(chats.error.message);
  const chatById = new Map((chats.data ?? []).map((row) => [String(row.id), String(row.name ?? "Группа")]));
  return {
    count: ids.length,
    groups: visibleIds.filter((id) => chatById.has(id)).map((id) => ({
      id, name: chatById.get(id)!, tag: community.get(id)?.effectiveTag ?? null,
    })),
  };
}
