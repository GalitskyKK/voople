export {
  clearEquipSlotRest as clearEquipSlot,
  getAvatarHistoryRest as getAvatarHistory,
  selectAvatarFromHistoryRest as selectAvatarFromHistory,
  setAvatarPhotoRest as setAvatarPhoto,
  setCustomBannerRest as setCustomBanner,
} from "@/server/data/customization-rest";

import { equipShopItemRest, updateProfileCustomizationRest, type CustomizationEquipPatch } from "@/server/data/customization-rest";
import { getEquippedCustomizationRest, getShopItemRowRest } from "@/server/data/shop-rest";
import { getPersonalStyleAccess } from "@/server/services/personal-style-access.service";
import { assertAppThemeSelectionAllowed, resolveEffectiveAppThemeId, isFreeAppThemeId } from "@/lib/app-themes";
import { SHOP_CATALOG_BY_ID } from "@/lib/shop/catalog";
import { assertNicknameFontSelectionAllowed, resolveEffectiveNicknameFont } from "@/lib/customization/nickname-font";
import { resolveRowEquipSlot, resolveRowEquipValue } from "@/lib/shop/item-row";

export async function updateCustomization(userId: string, patch: CustomizationEquipPatch) {
  assertAppThemeSelectionAllowed(patch.appThemeId, true);
  assertNicknameFontSelectionAllowed(patch.nicknameFont, true);
  const access = (patch.appThemeId != null && !isFreeAppThemeId(patch.appThemeId))
    || (patch.nicknameFont != null && patch.nicknameFont !== "sans")
    ? await getPersonalStyleAccess(userId) : null;
  return updateProfileCustomizationRest(userId, patch, {
    selectPaidAppTheme: access?.capabilities.selectPaidAppTheme ?? false,
    selectPremiumNicknameFont: access?.capabilities.selectPremiumNicknameFont ?? false,
  });
}

export async function equipShopItem(userId: string, itemId: string) {
  const row = await getShopItemRowRest(itemId);
  if (!row) throw new Error("Предмет не найден");
  const catalog = SHOP_CATALOG_BY_ID.get(itemId);
  const value = resolveRowEquipValue(row, catalog);
  const selectPaidAppTheme = resolveRowEquipSlot(row, catalog) === "app_theme_id" && value && !isFreeAppThemeId(value)
    ? (await getPersonalStyleAccess(userId)).capabilities.selectPaidAppTheme : false;
  // The data adapter still checks requires_subscription and ownership independently.
  return equipShopItemRest(userId, itemId, { selectPaidAppTheme });
}

export async function getEquippedCustomization(userId: string) {
  const [equipped, access] = await Promise.all([
    getEquippedCustomizationRest(userId), getPersonalStyleAccess(userId),
  ]);
  return { ...equipped, savedNicknameFont: equipped.nicknameFont,
    effectiveNicknameFont: resolveEffectiveNicknameFont(equipped.nicknameFont, access.capabilities.selectPremiumNicknameFont),
    selectPremiumNicknameFont: access.capabilities.selectPremiumNicknameFont,
    savedAppThemeId: equipped.appThemeId,
    effectiveAppThemeId: resolveEffectiveAppThemeId(equipped.appThemeId, access.capabilities.selectPaidAppTheme) };
}
