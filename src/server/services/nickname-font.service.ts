import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPersonalStyleAccess } from "@/server/services/personal-style-access.service";
import { resolveEffectiveNicknameFont } from "@/lib/customization/nickname-font";

/** Authenticated self read; the saved preference is never cleaned up. */
export async function getAccountNicknameFont(userId: string) {
  const [saved, access] = await Promise.all([
    getAdminClient().from("profile_customization").select("nickname_font").eq("user_id", userId).maybeSingle(),
    getPersonalStyleAccess(userId),
  ]);
  if (saved.error) throw new Error("Unable to load saved nickname font", { cause: saved.error });
  const savedNicknameFont = saved.data?.nickname_font ?? "sans";
  return { savedNicknameFont,
    effectiveNicknameFont: resolveEffectiveNicknameFont(savedNicknameFont, access.capabilities.selectPremiumNicknameFont),
    selectPremiumNicknameFont: access.capabilities.selectPremiumNicknameFont };
}
