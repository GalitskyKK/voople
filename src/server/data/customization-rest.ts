import { getAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/object-storage";
import { customizationAssetPath } from "@/lib/customization/asset-path";
import { isAppThemeId, isFreeAppThemeId } from "@/lib/app-themes";
import { getFramePreset } from "@/lib/customization/frames-registry";
import { isFreeNicknameColor } from "@/lib/customization/nickname-options";
import { SHOP_CATALOG_BY_ID } from "@/lib/shop/catalog";
import { assertActiveSubscriptionRest, hasActiveSubscriptionRest } from "@/server/data/subscription-rest";
import { getInventoryItemIdsRest, getShopItemRowRest } from "@/server/data/shop-rest";
import { resolvePublicMediaKey } from "@/server/services/upload.service";
import {
  FREE_AVATAR_HISTORY_LIMIT,
  VOOPLUS_AVATAR_HISTORY_LIMIT,
} from "@/lib/constants/subscription";

export type CustomizationEquipPatch = {
  profileEffectId?: string | null;
  profileBackgroundId?: string | null;
  profileFrameId?: string | null;
  frameColor?: string | null;
  cardBaseMode?: string | null;
  avatarRingId?: string | null;
  bannerId?: string | null;
  avatarDecorationId?: string | null;
  feedCardStyleId?: string | null;
  animatedAvatarId?: string | null;
  appThemeId?: string | null;
  nicknameColor?: string | null;
  nicknameGradient?: boolean | null;
  nicknameFont?: string | null;
  nicknameEffect?: string | null;
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

async function assertAppThemeAllowed(
  userId: string,
  appThemeId: string | null | undefined,
) {
  if (!appThemeId) return;
  if (!isAppThemeId(appThemeId)) throw new Error("Неизвестная тема приложения");
  if (isFreeAppThemeId(appThemeId)) return;
  await assertActiveSubscriptionRest(userId);
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
  await assertOwnsEquipValue(ownedIds, patch.profileBackgroundId, trustedItemId);
  const framePreset = getFramePreset(patch.profileFrameId);
  if (patch.profileFrameId && !framePreset) {
    await assertOwnsEquipValue(ownedIds, patch.profileFrameId, trustedItemId);
  }
  if (framePreset?.isPremium || framePreset?.usesCustomColor) {
    await assertActiveSubscriptionRest(userId);
  }
  await assertOwnsEquipValue(ownedIds, patch.avatarRingId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.bannerId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.avatarDecorationId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.feedCardStyleId, trustedItemId);
  await assertOwnsEquipValue(ownedIds, patch.animatedAvatarId, trustedItemId);
  await assertAppThemeAllowed(userId, patch.appThemeId);

  // Base palette is part of the editor and never requires a shop purchase.
  // Voople+ unlocks an exact custom HEX color; legacy shop colors remain
  // readable in existing profiles but are no longer the source of ownership.
  if (patch.nicknameColor && !isFreeNicknameColor(patch.nicknameColor)) {
    await assertActiveSubscriptionRest(userId);
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.profileEffectId !== undefined) {
    update.profile_effect_id = patch.profileEffectId;
  }
  if (patch.profileBackgroundId !== undefined) {
    update.profile_background_id = patch.profileBackgroundId;
  }
  // Free presets are available to everyone. Premium/custom-color presets are
  // subscription gated; purchased raster frames are validated by ownership.
  if (patch.profileFrameId !== undefined) {
    update.profile_frame_id = patch.profileFrameId;
  }
  if (patch.frameColor) {
    await assertActiveSubscriptionRest(userId);
  }
  if (patch.frameColor !== undefined) {
    update.frame_color = patch.frameColor;
  }
  // Основа карточки: mirror — дефолт (бесплатно); theme/plain (оверрайд) требуют Voople+.
  if (patch.cardBaseMode && patch.cardBaseMode !== "mirror") {
    await assertActiveSubscriptionRest(userId);
  }
  if (patch.cardBaseMode !== undefined) {
    update.card_base_mode = patch.cardBaseMode;
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
  if (patch.nicknameFont !== undefined) {
    if (patch.nicknameFont && patch.nicknameFont !== "sans") await assertActiveSubscriptionRest(userId);
    update.nickname_font = patch.nicknameFont ?? "sans";
  }
  if (patch.nicknameEffect !== undefined) {
    if (patch.nicknameEffect && patch.nicknameEffect !== "plain") await assertActiveSubscriptionRest(userId);
    update.nickname_effect = patch.nicknameEffect ?? "plain";
    update.nickname_gradient = patch.nicknameEffect === "gradient";
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
  if (row.requires_subscription) await assertActiveSubscriptionRest(userId);

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
    case "profile_background_id":
      patch.profileBackgroundId = value;
      break;
    case "profile_frame_id":
      patch.profileFrameId = value;
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
  const { data: existing, error: existingError } = await admin
    .from("profile_customization")
    .select("avatar_data")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  const previous = (existing?.avatar_data ?? {}) as { url?: string; key?: string; history?: Array<{ url?: string; key?: string }> };
  const hasVooplePlus = await hasActiveSubscriptionRest(userId);
  const historyLimit = hasVooplePlus ? VOOPLUS_AVATAR_HISTORY_LIMIT : FREE_AVATAR_HISTORY_LIMIT;
  const history = [
    { url, key },
    ...(previous.url && previous.key ? [{ url: previous.url, key: previous.key }] : []),
    ...(previous.history ?? []).filter((entry) => entry.url && entry.key),
  ].filter((entry, index, all) => all.findIndex((candidate) => candidate.key === entry.key) === index).slice(0, historyLimit);
  const { error } = await admin
    .from("profile_customization")
    .update({
      avatar_type: "photo",
      avatar_data: { url, key, history },
      animated_avatar_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return { url, key };
}

export async function getAvatarHistoryRest(userId: string): Promise<Array<{ url: string; key: string }>> {
  const admin = getAdminClient();
  const { data, error } = await admin.from("profile_customization").select("avatar_data").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const avatarData = (data?.avatar_data ?? {}) as { history?: Array<{ url?: string; key?: string }> };
  const hasVooplePlus = await hasActiveSubscriptionRest(userId);
  const historyLimit = hasVooplePlus ? VOOPLUS_AVATAR_HISTORY_LIMIT : FREE_AVATAR_HISTORY_LIMIT;
  return (avatarData.history ?? []).filter((entry): entry is { url: string; key: string } => Boolean(entry.url && entry.key)).slice(0, historyLimit);
}

export async function selectAvatarFromHistoryRest(userId: string, key: string) {
  const history = await getAvatarHistoryRest(userId);
  const selected = history.find((entry) => entry.key === key);
  if (!selected) throw new Error("Аватар не найден в сохранённых");
  const reordered = [selected, ...history.filter((entry) => entry.key !== key)];
  const admin = getAdminClient();
  const { error } = await admin.from("profile_customization").update({
    avatar_type: "photo",
    avatar_data: { ...selected, history: reordered },
    animated_avatar_id: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return selected;
}

export async function clearEquipSlotRest(userId: string, slot: string) {
  const patch: CustomizationEquipPatch = {};

  switch (slot) {
    case "profile_effect_id":
      patch.profileEffectId = null;
      break;
    case "profile_background_id":
      patch.profileBackgroundId = null;
      break;
    case "profile_frame_id":
      patch.profileFrameId = null;
      patch.frameColor = null;
      break;
    case "card_base_mode":
      patch.cardBaseMode = "mirror";
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
      patch.nicknameFont = "sans";
      patch.nicknameEffect = "plain";
      break;
    default:
      throw new Error("Неизвестный слот");
  }

  await updateProfileCustomizationRest(userId, patch);
}
