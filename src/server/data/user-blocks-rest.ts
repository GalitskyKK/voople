import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export type UserBlockState = {
  blockedByMe: boolean;
};

export async function getUserBlockStateRest(
  viewerId: string,
  targetId: string,
): Promise<UserBlockState> {
  if (viewerId === targetId) return { blockedByMe: false };
  const { data, error } = await getAdminClient()
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", viewerId)
    .eq("blocked_id", targetId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { blockedByMe: Boolean(data) };
}

export async function filterUnblockedUserIdsRest(
  viewerId: string,
  candidateIds: string[],
) {
  const uniqueIds = [...new Set(candidateIds)];
  const otherIds = uniqueIds.filter((id) => id !== viewerId);
  if (!otherIds.length) return uniqueIds;
  const admin = getAdminClient();
  const [blockedByViewer, blockingViewer] = await Promise.all([
    admin.from("user_blocks").select("blocked_id")
      .eq("blocker_id", viewerId).in("blocked_id", otherIds),
    admin.from("user_blocks").select("blocker_id")
      .eq("blocked_id", viewerId).in("blocker_id", otherIds),
  ]);
  if (blockedByViewer.error) throw new Error(blockedByViewer.error.message);
  if (blockingViewer.error) throw new Error(blockingViewer.error.message);
  const excluded = new Set([
    ...(blockedByViewer.data ?? []).map((row) => String(row.blocked_id)),
    ...(blockingViewer.data ?? []).map((row) => String(row.blocker_id)),
  ]);
  return uniqueIds.filter((id) => !excluded.has(id));
}

export async function assertUsersCanInteractRest(firstId: string, secondId: string) {
  if (firstId === secondId) return;
  const allowed = await filterUnblockedUserIdsRest(firstId, [secondId]);
  if (!allowed.includes(secondId)) throw new Error("Общение с пользователем недоступно");
}

export async function setUserBlockRest(input: {
  blockerId: string;
  blockedId: string;
  blocked: boolean;
}) {
  if (input.blockerId === input.blockedId) throw new Error("Нельзя заблокировать себя");
  const { data, error } = await getAdminClient().rpc("set_user_block", {
    p_blocker_id: input.blockerId,
    p_blocked_id: input.blockedId,
    p_blocked: input.blocked,
  });
  if (error) {
    if (error.message.includes("USER_BLOCK_TARGET_MISSING")) {
      throw new Error("Пользователь не найден");
    }
    throw new Error("Не удалось изменить блокировку");
  }
  return { blocked: data === true };
}
