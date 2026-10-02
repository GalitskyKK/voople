import { getAdminClient } from "@/lib/supabase/admin";

export async function getSavedAppThemeRest(userId: string): Promise<string | null> {
  const { data, error } = await getAdminClient().from("profile_customization")
    .select("app_theme_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Unable to load account theme");
  return data?.app_theme_id ?? null;
}
