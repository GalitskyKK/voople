import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export async function listContactPinsRest(userId: string) {
  const { data, error } = await getAdminClient()
    .from("user_contact_pins")
    .select("pinned_user_id")
    .eq("user_id", userId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.pinned_user_id));
}

export async function toggleContactPinRest(userId: string, pinnedUserId: string) {
  const { data, error } = await getAdminClient().rpc("toggle_user_contact_pin", {
    p_user_id: userId,
    p_pinned_user_id: pinnedUserId,
  });
  if (error) throw new Error(error.message);
  return { pinned: data === true, pinnedUserIds: await listContactPinsRest(userId) };
}
