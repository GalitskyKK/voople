import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  canViewPrivateFieldRest,
  getUserPrivacySettingsRest,
} from "@/server/data/privacy-rest";
import { assertUsersCanInteractRest } from "@/server/data/user-blocks-rest";

export async function assertCanOpenDirectChatRest(
  currentUserId: string,
  otherUserId: string,
) {
  if (currentUserId === otherUserId) {
    throw new Error("Нельзя написать самому себе");
  }
  await assertUsersCanInteractRest(currentUserId, otherUserId);

  const [userLowId, userHighId] = currentUserId < otherUserId
    ? [currentUserId, otherUserId]
    : [otherUserId, currentUserId];
  const { data: existingPair, error: pairError } = await getAdminClient()
    .from("direct_chat_pairs")
    .select("chat_id")
    .eq("user_low_id", userLowId)
    .eq("user_high_id", userHighId)
    .maybeSingle();
  if (pairError) throw new Error(pairError.message);
  if (existingPair) return;

  const privacy = await getUserPrivacySettingsRest(otherUserId);
  const allowed = await canViewPrivateFieldRest(
    otherUserId,
    currentUserId,
    privacy.connectionRequestScope,
  );
  if (!allowed) {
    throw new Error("Пользователь ограничил новые запросы на общение");
  }
}

export async function assertCanUseDirectChatRest(
  chatId: string,
  currentUserId: string,
) {
  const { data: pair, error } = await getAdminClient()
    .from("direct_chat_pairs")
    .select("user_low_id, user_high_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!pair) return;

  const lowId = String(pair.user_low_id);
  const highId = String(pair.user_high_id);
  if (currentUserId !== lowId && currentUserId !== highId) {
    throw new Error("Нет доступа к этой беседе");
  }
  await assertUsersCanInteractRest(
    currentUserId,
    currentUserId === lowId ? highId : lowId,
  );
}
