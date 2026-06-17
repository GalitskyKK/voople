import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
import { customizationAssetPath } from "@/lib/customization/asset-path";
import { SHOP_CATALOG_BY_ID } from "@/lib/shop/catalog";
import { assertActiveSubscriptionRest } from "@/server/data/subscription-rest";
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
  themePrimary?: string | null;
  themeAccent?: string | null;
};

function catalogGrantsEquipValue(itemId: string, equipValue: string): boolean {
  const catalog = SHOP_CATALOG_BY_ID.get(itemId);
  return catalog?.equipValue === equipValue;
}

async function itemGrantsEquipValue(itemId: string, equipValue: string): Promise<boolean> {
  if (catalogGrantsEquipValue(itemId, equipValue)) return true;
  const row = await getShopItemRowRest(itemId);
  return row?.equip_value === equipValue;
}

async function assertOwnsEquipValue(
  itemIds: Set<string>,
  equipValue: string | null | undefined,
  trustedItemId?: string,
) {
  if (!equipValue) return;

  if (trustedItemId && itemIds.has(trustedItemId) && (await itemGrantsEquipValue(trustedItemId, equipValue))) {
    return;
  }

  for (const id of itemIds) {
    if (await itemGrantsEquipValue(id, equipValue)) return;
  }

  throw new Error("Предмет не куплен");
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

export async function updateProfileCustomizationRest(
  userId: string,
  patch: CustomizationEquipPatch,
  options?: { trustedItemId?: string },
) {
  const ownedIds = await getInventoryItemIdsRest(userId);
  const trustedItemId = options?.trustedItemId;

  await assertOwnsEquipValue(ownedIds, patch.profileEffectId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.avatarRingId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.bannerId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.avatarDecorationId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.feedCardStyleId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.animatedAvatarId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.appThemeId, trustedItemId);

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
    if (patch.animatedAvatarId) {
      update.avatar_type = "constructor";
      update.avatar_data = {};
    }
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
  // Тема профиля (градиент карточки) — премиум-фича: установка цветов требует Voople+.
  // Сброс (null) разрешён всегда.
  if (patch.themePrimary !== undefined || patch.themeAccent !== undefined) {
    if (patch.themePrimary || patch.themeAccent) {
      await assertActiveSubscriptionRest(userId);
    }
    if (patch.themePrimary !== undefined) update.theme_primary = patch.themePrimary;
    if (patch.themeAccent !== undefined) update.theme_accent = patch.themeAccent;
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

  await updateProfileCustomizationRest(userId, patch, { trustedItemId: itemId });
  return patch;
}

export async function setCustomBannerRest(userId: string, mediaKey: string) {
  await assertActiveSubscriptionRest(userId);

  const key = await resolvePublicMediaKey(mediaKey, userId, "banner");
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
  const key = await resolvePublicMediaKey(mediaKey, userId, "avatar");
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
