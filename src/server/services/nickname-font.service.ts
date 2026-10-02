import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPersonalStyleAccess } from "@/server/services/personal-style-access.service";
import { resolveEffectiveNicknameEffect } from "@/lib/customization/nickname-effect";
import { resolveEffectiveNicknameFont } from "@/lib/customization/nickname-font";

/** Authenticated self read; the saved preference is never cleaned up. */
export async function getAccountNicknameFont(userId: string) {
  const [saved, access] = await Promise.all([
    getAdminClient().from("profile_customization").select("nickname_font,nickname_effect,nickname_gradient").eq("user_id", userId).maybeSingle(),
    getPersonalStyleAccess(userId),
  ]);
  if (saved.error) throw new Error("Unable to load saved nickname font", { cause: saved.error });
  const savedNicknameFont = saved.data?.nickname_font ?? "sans";
  const effect = resolveEffectiveNicknameEffect(saved.data?.nickname_effect, saved.data?.nickname_gradient, access.capabilities.selectPremiumNicknameEffect);
  return { savedNicknameFont, savedNicknameEffect: saved.data?.nickname_effect ?? "plain",
    savedNicknameGradient: saved.data?.nickname_gradient ?? false, effectiveNicknameEffect: effect.effect,
    effectiveNicknameGradient: effect.gradient, selectPremiumNicknameEffect: access.capabilities.selectPremiumNicknameEffect,
    effectiveNicknameFont: resolveEffectiveNicknameFont(savedNicknameFont, access.capabilities.selectPremiumNicknameFont),
    selectPremiumNicknameFont: access.capabilities.selectPremiumNicknameFont };
}
