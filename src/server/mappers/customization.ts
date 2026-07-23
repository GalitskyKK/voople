import { resolveCustomization, type CustomizationInput } from "@/lib/customization/resolve";
import { DEFAULT_THEME } from "@/lib/constants/theme";
import type { ProfileCustomizationView } from "@/types/domain";

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
  options?: { hasActiveSubscription?: boolean },
): ProfileCustomizationView {
  const raw = rowToInput(row);
  // The server still cleans expired premium selections (see subscription-rest),
  // but profile reads must be safe even before that maintenance pass happens.
  // These fields are subscriber-only and therefore immediately fall back.
  const input = options?.hasActiveSubscription === false
    ? {
        ...raw,
        // Slate and Glass are free presets. They must not disappear merely
        // because the account has no active subscription.
        profileFrameId: raw.profileFrameId,
        frameColor: null,
        cardBaseMode: "mirror",
        themePrimary: null,
        themeAccent: null,
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
