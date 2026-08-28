import { getAdminClient } from "@/lib/supabase/admin";
import { assertChatMemberRest } from "@/server/data/chat-access-rest";
import { getGroupCommunityRest } from "@/server/data/chat-community-rest";
import { getVisibleGroupRoomPresenceRest } from "@/server/data/chat-group-room-presence-rest";
import { mapUserSearchRow, type UserSearchRow } from "@/server/mappers/user-search";
import type { ChatGroupMemberView } from "@/types/chat";

const USER_CARD_SELECT =
  "id, username, display_name, bio, subscriptions (started_at, expires_at), profile_customization (avatar_type, avatar_data, animated_avatar_id)";

export async function listGroupMembersRest(
  chatId: string,
  userId: string,
): Promise<ChatGroupMemberView[]> {
  const membership = await assertChatMemberRest(chatId, userId);
  if (membership.type !== "group") throw new Error("Это не групповая беседа");

  const admin = getAdminClient();
  const [{ data, error }, community, activeRooms] = await Promise.all([
    admin
      .from("chat_members")
      .select(`user_id, role, joined_at, users (${USER_CARD_SELECT})`)
      .eq("chat_id", membership.accessChatId)
      .order("joined_at", { ascending: true }),
    getGroupCommunityRest(membership.accessChatId, userId),
    getVisibleGroupRoomPresenceRest(membership, userId),
  ]);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .flatMap((row) => {
      const relation = row.users as UserSearchRow | UserSearchRow[] | null;
      const user = Array.isArray(relation) ? relation[0] : relation;
      if (!user) return [];
      const role: ChatGroupMemberView["role"] =
        row.role === "owner" || row.role === "admin" ? row.role : "member";
      return [{
        ...mapUserSearchRow(user),
        role,
        roleColor: community.effectiveRoleColors[role],
        activeRoom: activeRooms.get(user.id) ?? null,
      } satisfies ChatGroupMemberView];
    })
    .sort((a, b) => {
      const priority = { owner: 0, admin: 1, member: 2 } as const;
      return priority[a.role] - priority[b.role];
    });
}
