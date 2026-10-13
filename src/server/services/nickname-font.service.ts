import { projectProfileCardFacts } from "@/lib/customization/profile-card-access";
import { resolveEffectiveNicknameColor } from "@/lib/customization/nickname-color";
import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPersonalStyleAccess } from "@/server/services/personal-style-access.service";
import { resolveEffectiveNicknameEffect } from "@/lib/customization/nickname-effect";
import { resolveEffectiveNicknameFont } from "@/lib/customization/nickname-font";

/** Authenticated self read; the saved preference is never cleaned up. */
export async function getAccountNicknameFont(userId: string) {
  const [saved, access] = await Promise.all([
    getAdminClient().from("profile_customization").select("nickname_font,nickname_effect,nickname_gradient,nickname_color,profile_frame_id,frame_color,card_base_mode,theme_primary,theme_accent").eq("user_id", userId).maybeSingle(),
    getPersonalStyleAccess(userId),
  ]);
  if (saved.error) throw new Error("Unable to load saved nickname font", { cause: saved.error });
  const savedNicknameFont = saved.data?.nickname_font ?? "sans";
  const effect = resolveEffectiveNicknameEffect(saved.data?.nickname_effect, saved.data?.nickname_gradient, access.capabilities.selectPremiumNicknameEffect);
  return { ...projectProfileCardFacts({ profileFrameId: saved.data?.profile_frame_id, frameColor: saved.data?.frame_color, cardBaseMode: saved.data?.card_base_mode, themePrimary: saved.data?.theme_primary, themeAccent: saved.data?.theme_accent }, access.capabilities), savedNicknameColor: saved.data?.nickname_color ?? null,
    effectiveNicknameColor: resolveEffectiveNicknameColor(saved.data?.nickname_color, access.capabilities.selectCustomNicknameColor),
    selectCustomNicknameColor: access.capabilities.selectCustomNicknameColor, savedNicknameFont, savedNicknameEffect: saved.data?.nickname_effect ?? "plain",
    savedNicknameGradient: saved.data?.nickname_gradient ?? false, effectiveNicknameEffect: effect.effect,
    effectiveNicknameGradient: effect.gradient, selectPremiumNicknameEffect: access.capabilities.selectPremiumNicknameEffect,
    effectiveNicknameFont: resolveEffectiveNicknameFont(savedNicknameFont, access.capabilities.selectPremiumNicknameFont),
    selectPremiumNicknameFont: access.capabilities.selectPremiumNicknameFont };
}
