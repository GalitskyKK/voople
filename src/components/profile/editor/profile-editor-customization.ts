import { resolveCustomization } from "@/lib/customization/resolve";
import type { ProfileCustomizationView } from "@/types/domain";
import type { EquippedCustomizationView, ShopItemView } from "@/types/shop";

export function customizationFromEquipped(
  equipped: EquippedCustomizationView,
  fallback: ProfileCustomizationView,
): ProfileCustomizationView {
  const value = resolveCustomization({
    bannerId: equipped.bannerId,
    avatarRingId: equipped.avatarRingId,
    profileFrameId: equipped.profileFrameId,
    frameColor: equipped.frameColor,
    cardBaseMode: equipped.cardBaseMode,
    avatarDecorationId: equipped.avatarDecorationId,
    feedCardStyleId: equipped.feedCardStyleId,
    animatedAvatarId: equipped.animatedAvatarId,
    animatedAvatarUrl: equipped.animatedAvatarId ? null : fallback.assets.animatedAvatarUrl,
    profileBackgroundId: equipped.profileBackgroundId,
    nicknameColor: equipped.nicknameColor,
    nicknameGradient: equipped.nicknameGradient,
    nicknameFont: equipped.nicknameFont,
    nicknameEffect: equipped.nicknameEffect,
    themePrimary: equipped.themePrimary,
    themeAccent: equipped.themeAccent,
  });

  return {
    ...value,
    bannerValue: {
      color: fallback.bannerValue.color,
      url: value.assets.bannerUrl ?? undefined,
    },
  };
}

export function isProfileItemSelected(
  item: ShopItemView,
  value: EquippedCustomizationView | null,
) {
  if (!value || !item.equipValue) return false;
  const slots: Partial<Record<ShopItemView["equipSlot"], string | null>> = {
    avatar_decoration_id: value.avatarDecorationId,
    avatar_ring_id: value.avatarRingId,
    animated_avatar_id: value.animatedAvatarId,
    banner: value.bannerId,
    profile_background_id: value.profileBackgroundId,
    profile_frame_id: value.profileFrameId,
    feed_card_style_id: value.feedCardStyleId,
    nickname_style: value.nicknameColor,
  };
  return slots[item.equipSlot] === item.equipValue;
}

export function equipProfileItem(
  current: EquippedCustomizationView,
  item: ShopItemView,
): EquippedCustomizationView {
  if (!item.equipValue) return current;
  const next = { ...current };
  if (item.equipSlot === "avatar_decoration_id") next.avatarDecorationId = item.equipValue;
  if (item.equipSlot === "avatar_ring_id") next.avatarRingId = item.equipValue;
  if (item.equipSlot === "animated_avatar_id") next.animatedAvatarId = item.equipValue;
  if (item.equipSlot === "banner") next.bannerId = item.equipValue;
  if (item.equipSlot === "profile_background_id") next.profileBackgroundId = item.equipValue;
  if (item.equipSlot === "profile_frame_id") next.profileFrameId = item.equipValue;
  if (item.equipSlot === "feed_card_style_id") next.feedCardStyleId = item.equipValue;
  if (item.equipSlot === "nickname_style") {
    next.nicknameColor = item.equipValue;
    next.nicknameGradient = true;
  }
  return next;
}

export function clearProfileSlot(
  current: EquippedCustomizationView,
  slot: ShopItemView["equipSlot"] | "card_base_mode",
): EquippedCustomizationView {
  const next = { ...current };
  if (slot === "avatar_decoration_id") next.avatarDecorationId = null;
  if (slot === "avatar_ring_id") next.avatarRingId = null;
  if (slot === "animated_avatar_id") next.animatedAvatarId = null;
  if (slot === "banner") next.bannerId = null;
  if (slot === "profile_background_id") next.profileBackgroundId = null;
  if (slot === "profile_frame_id") {
    next.profileFrameId = null;
    next.frameColor = null;
  }
  if (slot === "feed_card_style_id") next.feedCardStyleId = null;
  if (slot === "nickname_style") {
    next.nicknameColor = null;
    next.nicknameGradient = false;
    next.nicknameFont = "sans";
    next.nicknameEffect = "plain";
  }
  if (slot === "card_base_mode") next.cardBaseMode = "mirror";
  return next;
}
