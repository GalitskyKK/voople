import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export async function toggleChatSectionFavoriteRest(userId: string, sectionId: string) {
  const { data, error } = await getAdminClient().rpc("toggle_chat_section_favorite", {
    p_user_id: userId,
    p_section_id: sectionId,
  });
  if (error) throw new Error(error.message);
  return { favorite: data === true };
}
