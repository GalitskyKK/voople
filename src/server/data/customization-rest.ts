import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
import { customizationAssetPath } from "@/lib/customization/asset-path";
import { SHOP_CATALOG_BY_ID } from "@/lib/shop/catalog";
import { getInventoryItemIdsRest, getShopItemRowRest } from "@/server/data/shop-rest";
import { resolvePublicMediaKey } from "@/server/services/upload.service";

export type CustomizationEquipPatch = {
  profileEffectId?: string | null;
  avatarRingId?: string | null;
  bannerId?: string | null;
  avatarDecorationId?: string | null;
  feedCardStyleId?: string | null;
  animatedAvatarId?: string | null;
  appThemeId?: string | null;
  nicknameColor?: string | null;
  nicknameGradient?: boolean | null;
};

function itemGrantsEquipValue(itemId: string, equipValue: string): boolean {
  const catalog = SHOP_CATALOG_BY_ID.get(itemId);
  return catalog?.equipValue === equipValue;
}

async function assertOwnsEquipValue(userId: string, itemIds: Set<string>, equipValue: string | null | undefined) {
  if (!equipValue) return;
  const owns = [...itemIds].some((id) => itemGrantsEquipValue(id, equipValue));
  if (!owns) {
    throw new Error("Предмет не куплен");
  }
}

async function resolveBannerPatch(bannerId: string | null | undefined) {
  if (!bannerId) {
    return {
      banner_type: "color" as const,
      banner_value: { color: "#1A0D2E" },
    };
  }

  const url = customizationAssetPath("banners", bannerId);
  return {
    banner_type: "animated" as const,
    banner_value: { id: bannerId, url },
  };
}

export async function updateProfileCustomizationRest(userId: string, patch: CustomizationEquipPatch) {
  const ownedIds = await getInventoryItemIdsRest(userId);

  await assertOwnsEquipValue(userId, ownedIds, patch.profileEffectId);
  await assertOwnsEquipValue(userId, ownedIds, patch.avatarRingId);
  await assertOwnsEquipValue(userId, ownedIds, patch.bannerId);
  await assertOwnsEquipValue(userId, ownedIds, patch.avatarDecorationId);
  await assertOwnsEquipValue(userId, ownedIds, patch.feedCardStyleId);
  await assertOwnsEquipValue(userId, ownedIds, patch.animatedAvatarId);
  await assertOwnsEquipValue(userId, ownedIds, patch.appThemeId);

  if (patch.nicknameColor) {
    const ownsStyle = [...ownedIds].some((id) => {
      const catalog = SHOP_CATALOG_BY_ID.get(id);
      return catalog?.equipSlot === "nickname_style" && catalog.equipValue === patch.nicknameColor;
    });
    if (!ownsStyle) throw new Error("Стиль имени не куплен");
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.profileEffectId !== undefined) {
    update.profile_effect_id = patch.profileEffectId;
  }
  if (patch.avatarRingId !== undefined) {
    update.avatar_ring_id = patch.avatarRingId;
  }
  if (patch.avatarDecorationId !== undefined) {
    update.avatar_decoration_id = patch.avatarDecorationId;
  }
  if (patch.feedCardStyleId !== undefined) {
    update.feed_card_style_id = patch.feedCardStyleId;
  }
  if (patch.animatedAvatarId !== undefined) {
    update.animated_avatar_id = patch.animatedAvatarId;
  }
  if (patch.appThemeId !== undefined) {
    update.app_theme_id = patch.appThemeId;
  }
  if (patch.nicknameColor !== undefined) {
    update.nickname_color = patch.nicknameColor;
  }
  if (patch.nicknameGradient !== undefined) {
    update.nickname_gradient = patch.nicknameGradient;
  }
  if (patch.bannerId !== undefined) {
    const bannerPatch = await resolveBannerPatch(patch.bannerId);
    update.banner_type = bannerPatch.banner_type;
    update.banner_value = bannerPatch.banner_value;
  }

  const admin = getAdminClient();
  const { error } = await admin.from("profile_customization").update(update).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function equipShopItemRest(userId: string, itemId: string) {
  const row = await getShopItemRowRest(itemId);
  if (!row) throw new Error("Предмет не найден");

  const ownedIds = await getInventoryItemIdsRest(userId);
  if (!ownedIds.has(itemId)) throw new Error("Сначала получите предмет");

  const catalog = SHOP_CATALOG_BY_ID.get(itemId);
  const slot = row.equip_slot ?? catalog?.equipSlot;
  const value = row.equip_value ?? catalog?.equipValue ?? null;

  if (!slot) throw new Error("Предмет нельзя экипировать");

  const patch: CustomizationEquipPatch = {};

  switch (slot) {
    case "profile_effect_id":
      patch.profileEffectId = value;
      break;
    case "avatar_ring_id":
      patch.avatarRingId = value;
      break;
    case "banner":
      patch.bannerId = value;
      break;
    case "avatar_decoration_id":
      patch.avatarDecorationId = value;
      break;
    case "feed_card_style_id":
      patch.feedCardStyleId = value;
      break;
    case "animated_avatar_id":
      patch.animatedAvatarId = value;
      break;
    case "app_theme_id":
      patch.appThemeId = value;
      break;
    case "nickname_style":
      patch.nicknameColor = value;
      patch.nicknameGradient = true;
      break;
    default:
      throw new Error("Неизвестный слот экипировки");
  }

  await updateProfileCustomizationRest(userId, patch);
  return patch;
}

export async function setCustomBannerRest(userId: string, mediaKey: string) {
  const key = resolvePublicMediaKey(mediaKey, userId, "banner");
  const url = publicAssetUrl(key);
  if (!url) throw new Error("Не удалось сохранить баннер");

  const admin = getAdminClient();
  const { error } = await admin
    .from("profile_customization")
    .update({
      banner_type: "animated",
      banner_value: { url, key },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return { url, key };
}

export async function setAvatarPhotoRest(userId: string, mediaKey: string) {
  const key = resolvePublicMediaKey(mediaKey, userId, "avatar");
  const url = publicAssetUrl(key);
  if (!url) throw new Error("Не удалось сохранить аватар");

  const admin = getAdminClient();
  const { error } = await admin
    .from("profile_customization")
    .update({
      avatar_type: "photo",
      avatar_data: { url, key },
      animated_avatar_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return { url, key };
}

export async function clearEquipSlotRest(userId: string, slot: string) {
  const patch: CustomizationEquipPatch = {};

  switch (slot) {
    case "profile_effect_id":
      patch.profileEffectId = null;
      break;
    case "avatar_ring_id":
      patch.avatarRingId = null;
      break;
    case "banner":
      patch.bannerId = null;
      break;
    case "avatar_decoration_id":
      patch.avatarDecorationId = null;
      break;
    case "feed_card_style_id":
      patch.feedCardStyleId = null;
      break;
    case "animated_avatar_id":
      patch.animatedAvatarId = null;
      break;
    case "app_theme_id":
      patch.appThemeId = null;
      break;
    case "nickname_style":
      patch.nicknameColor = null;
      patch.nicknameGradient = false;
      break;
    default:
      throw new Error("Неизвестный слот");
  }

  await updateProfileCustomizationRest(userId, patch);
}
