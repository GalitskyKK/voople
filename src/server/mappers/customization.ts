import { resolveCustomization, type CustomizationInput } from "@/lib/customization/resolve";
import type { ProfileCustomizationView } from "@/types/domain";

export type CustomizationRow = {
  banner_type?: string | null;
  banner_value?: unknown;
  avatar_type?: string | null;
  avatar_data?: unknown;
  avatar_ring_id?: string | null;
  profile_effect_id?: string | null;
  nameplate_id?: string | null;
  avatar_decoration_id?: string | null;
  feed_card_style_id?: string | null;
  animated_avatar_id?: string | null;
  app_theme_id?: string | null;
  nickname_color?: string | null;
  nickname_gradient?: boolean | null;
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

  return {
    themePrimary: row.theme_primary,
    themeAccent: row.theme_accent,
    bannerValue: bannerValue ?? undefined,
    bannerId: bannerValue?.id ?? (row.banner_type && row.banner_type !== "color" ? row.banner_type : null),
    avatarRingId: row.avatar_ring_id,
    profileEffectId: row.profile_effect_id,
    avatarDecorationId: row.avatar_decoration_id,
    feedCardStyleId: row.feed_card_style_id,
    animatedAvatarId: row.animated_avatar_id,
    nicknameColor: row.nickname_color,
    nicknameGradient: row.nickname_gradient,
    animatedAvatarUrl:
      row.avatar_type === "photo" && avatarData?.url ? avatarData.url : null,
  };
}

export function toProfileCustomizationView(
  row: CustomizationRow | null | undefined,
): ProfileCustomizationView {
  const resolved = resolveCustomization(rowToInput(row));
  return {
    ...resolved,
    bannerValue: {
      color: resolved.themePrimary,
      url: resolved.assets.bannerUrl ?? undefined,
    },
  };
}
