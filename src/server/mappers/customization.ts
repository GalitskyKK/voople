import { resolveEffectiveProfileFrameId, resolveEffectiveFrameColor, resolveEffectiveCardBaseMode, resolveEffectiveProfilePalette, type ProfileCardCapabilities } from "@/lib/customization/profile-card-access";
import { resolveEffectiveNicknameColor } from "@/lib/customization/nickname-color";
import { resolveCustomization, type CustomizationInput } from "@/lib/customization/resolve";
import { resolveEffectiveNicknameEffect } from "@/lib/customization/nickname-effect";
import { DEFAULT_THEME } from "@/lib/constants/theme";
import type { ProfileCustomizationView } from "@/types/domain";
import { resolveEffectiveNicknameFont } from "@/lib/customization/nickname-font";

export type CustomizationRow = {
  banner_type?: string | null;
  banner_value?: unknown;
  avatar_type?: string | null;
  avatar_data?: unknown;
  avatar_ring_id?: string | null;
  profile_effect_id?: string | null;
  profile_background_id?: string | null;
  profile_frame_id?: string | null;
  frame_color?: string | null;
  card_base_mode?: string | null;
  nameplate_id?: string | null;
  avatar_decoration_id?: string | null;
  feed_card_style_id?: string | null;
  animated_avatar_id?: string | null;
  app_theme_id?: string | null;
  nickname_color?: string | null;
  nickname_gradient?: boolean | null;
  nickname_font?: string | null;
  nickname_effect?: string | null;
  theme_primary?: string | null;
  theme_accent?: string | null;
};

function rowToInput(row: CustomizationRow | null | undefined): CustomizationInput {
  if (!row) return {};

  const bannerValue = row.banner_value as
    | { color?: string; url?: string; id?: string }
    | null
    | undefined;

  const avatarData = row.avatar_data as { url?: string } | null | undefined;
  const hasUploadedPhoto = row.avatar_type === "photo" && Boolean(avatarData?.url);

  return {
    themePrimary: row.theme_primary,
    themeAccent: row.theme_accent,
    bannerValue: bannerValue ?? undefined,
    bannerId: bannerValue?.id ?? (row.banner_type && row.banner_type !== "color" ? row.banner_type : null),
    avatarRingId: row.avatar_ring_id,
    profileEffectId: row.profile_effect_id,
    profileBackgroundId: row.profile_background_id,
    profileFrameId: row.profile_frame_id,
    frameColor: row.frame_color,
    cardBaseMode: row.card_base_mode,
    avatarDecorationId: row.avatar_decoration_id,
    feedCardStyleId: row.feed_card_style_id,
    animatedAvatarId: row.animated_avatar_id,
    nicknameColor: row.nickname_color,
    nicknameGradient: row.nickname_gradient,
    nicknameFont: row.nickname_font,
    nicknameEffect: row.nickname_effect,
    /** Загруженное фото — только если нет shop-ассета в `animated_avatar_id`. */
    animatedAvatarUrl:
      row.animated_avatar_id || !hasUploadedPhoto ? null : (avatarData?.url ?? null),
  };
}

export function toProfileCustomizationView(
  row: CustomizationRow | null | undefined,
  options?: Partial<ProfileCardCapabilities> & { hasActiveSubscription?: boolean; selectPremiumNicknameFont?: boolean; selectPremiumNicknameEffect?: boolean; selectCustomNicknameColor?: boolean },
): ProfileCustomizationView {
  const raw = rowToInput(row);
  raw.nicknameColor = resolveEffectiveNicknameColor(row?.nickname_color, options?.selectCustomNicknameColor ?? false);
  raw.nicknameFont = resolveEffectiveNicknameFont(row?.nickname_font, options?.selectPremiumNicknameFont ?? false);
  const effectiveEffect = resolveEffectiveNicknameEffect(row?.nickname_effect, row?.nickname_gradient, options?.selectPremiumNicknameEffect ?? false);
  raw.nicknameEffect = effectiveEffect.effect;
  raw.nicknameGradient = effectiveEffect.gradient;
  raw.profileFrameId = resolveEffectiveProfileFrameId(row?.profile_frame_id, options?.selectPremiumProfileFramePreset ?? options?.hasActiveSubscription ?? false);
  raw.frameColor = resolveEffectiveFrameColor(row?.frame_color, options?.selectCustomFrameColor ?? options?.hasActiveSubscription ?? false);
  raw.cardBaseMode = resolveEffectiveCardBaseMode(row?.card_base_mode, options?.selectPremiumCardBaseMode ?? options?.hasActiveSubscription ?? false);
  Object.assign(raw, resolveEffectiveProfilePalette(row?.theme_primary, row?.theme_accent, options?.selectProfilePalette ?? options?.hasActiveSubscription ?? false));
  // Uploaded banners retain their legacy subscription fallback.
  const input = options?.hasActiveSubscription === false
    ? {
        ...raw,
        bannerValue: raw.bannerValue?.id ? raw.bannerValue : undefined,
      }
    : raw;
  const resolved = resolveCustomization(input);
  return {
    ...resolved,
    bannerValue: {
      color: input.bannerValue?.color ?? DEFAULT_THEME.bannerColor,
      url: resolved.assets.bannerUrl ?? undefined,
    },
  };
}

export function compactAvatarFields(
  related: CustomizationRow | CustomizationRow[] | null | undefined,
) {
  const customization = toProfileCustomizationView(
    Array.isArray(related) ? related[0] : related,
  );
  return {
    avatarUrl: customization.assets.animatedAvatarUrl ?? null,
    avatarDecorationUrl: customization.assets.avatarDecorationUrl ?? null,
    avatarRingId: customization.avatarRingId ?? null,
  };
}
