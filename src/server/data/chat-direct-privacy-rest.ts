import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  canViewPrivateFieldRest,
  getUserPrivacySettingsRest,
} from "@/server/data/privacy-rest";

export async function assertCanOpenDirectChatRest(
  currentUserId: string,
  otherUserId: string,
) {
  if (currentUserId === otherUserId) {
    throw new Error("Нельзя написать самому себе");
  }

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
