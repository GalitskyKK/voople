import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { toProfileCustomizationView, type CustomizationRow } from "@/server/mappers/customization";
import type { GroupJoinRequestView } from "@/types/chat";
import { assertChatMemberRest } from "./chat-access-rest";

async function assertCanModerateJoinRequests(chatId: string, actorId: string) {
  const membership = await assertChatMemberRest(chatId, actorId);
  if (membership.parentChatId || membership.type !== "group") {
    throw new Error("Заявки доступны только в основной группе");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Недостаточно прав для управления заявками");
  }
}

export async function listGroupJoinRequestsRest(
  chatId: string,
  actorId: string,
): Promise<GroupJoinRequestView[]> {
  await assertCanModerateJoinRequests(chatId, actorId);
  const { data, error } = await getAdminClient()
    .from("group_join_requests")
    .select("id, user_id, created_at, users!group_join_requests_user_id_fkey(id, username, display_name, profile_customization(avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id))")
    .eq("chat_id", chatId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const related = row.users as unknown as {
      id: string;
      username: string;
      display_name: string;
      profile_customization?: CustomizationRow | CustomizationRow[] | null;
    } | Array<{
      id: string;
      username: string;
      display_name: string;
      profile_customization?: CustomizationRow | CustomizationRow[] | null;
    }> | null;
    const user = Array.isArray(related) ? related[0] : related;
    if (!user) return [];
    const customization = toProfileCustomizationView(
      Array.isArray(user.profile_customization)
        ? user.profile_customization[0]
        : user.profile_customization,
    );
    return [{
      id: row.id as string,
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: customization.assets.animatedAvatarUrl ?? null,
      createdAt: row.created_at as string,
    }];
  });
}

export async function resolveGroupJoinRequestRest(
  requestId: string,
  actorId: string,
  approve: boolean,
) {
  const { data, error } = await getAdminClient().rpc("resolve_group_join_request", {
    p_request_id: requestId,
    p_actor_id: actorId,
    p_approve: approve,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") throw new Error("Не удалось обработать заявку");
  return data as { chatId: string; userId: string; status: "approved" | "rejected" };
}
