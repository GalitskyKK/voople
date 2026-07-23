import { getAdminClient } from "@/lib/supabase/admin";
import { buildCustomizationStorageKey, deleteObject } from "@/lib/object-storage";
import {
  assetPackForKind,
  normalizeMediaBase,
  packFileNames,
  posterAssetIdForBase,
} from "@/lib/shop/asset-packs";
import {
  dbTypeForKind,
  defaultAssetFolderForKind,
  defaultEquipSlotForKind,
  kindRequiresCdnAsset,
} from "@/lib/shop/defaults";
import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";
import { SHOP_ITEM_SELECT, type ShopItemRow } from "@/lib/shop/item-row";
import type { AdminShopItemInput, AdminShopItemRecord } from "@/types/admin-shop";
import { mapAdminShopItemRecord } from "@/server/mappers/admin-shop";

function rowToRecord(row: ShopItemRow): AdminShopItemRecord {
  return mapAdminShopItemRecord(row);
}

const EQUIP_SLOT_COLUMN: Record<string, string> = {
  profile_effect_id: "profile_effect_id",
  profile_background_id: "profile_background_id",
  profile_frame_id: "profile_frame_id",
  avatar_ring_id: "avatar_ring_id",
  avatar_decoration_id: "avatar_decoration_id",
  feed_card_style_id: "feed_card_style_id",
  animated_avatar_id: "animated_avatar_id",
  app_theme_id: "app_theme_id",
  nickname_style: "nickname_color",
};

export async function listAdminShopItemsRest(): Promise<AdminShopItemRecord[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select(SHOP_ITEM_SELECT)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ShopItemRow[]).map(rowToRecord);
}

export async function getAdminShopItemRest(itemId: string): Promise<AdminShopItemRecord | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select(SHOP_ITEM_SELECT)
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToRecord(data as ShopItemRow);
}

function normalizeInput(input: AdminShopItemInput) {
  const kind = input.kind;
  const pack = assetPackForKind(kind);
  const mediaBase = pack ? normalizeMediaBase(input.equipValue ?? "") : "";
  const assetFolder =
    input.assetFolder === undefined
      ? defaultAssetFolderForKind(kind)
      : input.assetFolder;
  const equipSlot = input.equipSlot || defaultEquipSlotForKind(kind);
  const assetId = pack
    ? mediaBase
      ? posterAssetIdForBase(mediaBase, pack)
      : input.assetId?.trim() || null
    : input.assetId?.trim() || null;
  const cdnEquipValue = assetId
    ? kind === "profile_frame"
      ? assetId
      : assetId.replace(/\.[a-z0-9]{2,5}$/i, "")
    : null;
  const equipValue = pack
    ? mediaBase || input.equipValue?.trim() || null
    : kindRequiresCdnAsset(kind)
      ? cdnEquipValue
      : input.equipValue?.trim() || null;

  return {
    id: input.id.trim(),
    season_id: input.seasonId?.trim() || "launch",
    type: dbTypeForKind(kind),
    kind,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price_rub: input.priceRub,
    price_coins: input.priceCoins,
    is_free: input.isFree,
    preview_url: input.previewUrl?.trim() || null,
    sort_order: input.sortOrder,
    asset_folder: assetFolder,
    asset_id: assetId,
    equip_slot: equipSlot,
    equip_value: equipValue,
  };
}

export async function createAdminShopItemRest(input: AdminShopItemInput): Promise<AdminShopItemRecord> {
  const admin = getAdminClient();
  const row = normalizeInput(input);

  const { data, error } = await admin.from("shop_items").insert(row).select(SHOP_ITEM_SELECT).single();

  if (error) throw new Error(error.message);
  return rowToRecord(data as ShopItemRow);
}

export async function updateAdminShopItemRest(
  itemId: string,
  input: AdminShopItemInput,
): Promise<AdminShopItemRecord> {
  const admin = getAdminClient();
  const row = normalizeInput({ ...input, id: itemId });
  const { data: previous, error: previousError } = await admin
    .from("shop_items")
    .select("equip_slot, equip_value")
    .eq("id", itemId)
    .single();
  if (previousError) throw new Error(previousError.message);

  const { data, error } = await admin
    .from("shop_items")
    .update(row)
    .eq("id", itemId)
    .select(SHOP_ITEM_SELECT)
    .single();

  if (error) throw new Error(error.message);

  const previousColumn = previous.equip_slot ? EQUIP_SLOT_COLUMN[previous.equip_slot] : undefined;
  const nextColumn = row.equip_slot ? EQUIP_SLOT_COLUMN[row.equip_slot] : undefined;
  if (
    previousColumn &&
    nextColumn &&
    previousColumn === nextColumn &&
    previous.equip_value &&
    row.equip_value &&
    previous.equip_value !== row.equip_value
  ) {
    const customizationPatch: Record<string, unknown> = {
      [nextColumn]: row.equip_value,
      updated_at: new Date().toISOString(),
    };
    const { error: migrateError } = await admin
      .from("profile_customization")
      .update(customizationPatch)
      .eq(previousColumn, previous.equip_value);
    if (migrateError) throw new Error(`Товар сохранён, но экипировку пользователей обновить не удалось: ${migrateError.message}`);
  }
  return rowToRecord(data as ShopItemRow);
}

export async function deleteAdminShopItemRest(itemId: string, options?: { confirmInventoryRemoval?: boolean }): Promise<void> {
  const admin = getAdminClient();
  const { data: item, error: itemError } = await admin
    .from("shop_items")
    .select("kind, equip_slot, equip_value, asset_folder, asset_id")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError) throw new Error(itemError.message);

  // Assets may be intentionally shared by more than one shop record. Delete
  // the storage object only when this is the last record referring to it.
  const assetFolder = item?.asset_folder?.trim();
  const assetId = item?.asset_id?.trim();
  let orphanedAssetKeys: string[] = [];
  if (assetFolder && assetId) {
    const { count: sharedCount, error: sharedError } = await admin
      .from("shop_items")
      .select("id", { count: "exact", head: true })
      .eq("asset_folder", assetFolder)
      .eq("asset_id", assetId)
      .neq("id", itemId);
    if (sharedError) throw new Error(sharedError.message);
    if (!sharedCount) {
      const kind = item?.kind as ShopItemKind | undefined;
      const pack = kind ? assetPackForKind(kind) : null;
      if (pack && item?.equip_value) {
        const names = Object.values(packFileNames(normalizeMediaBase(item.equip_value), pack));
        orphanedAssetKeys = names.map((name) => buildCustomizationStorageKey(assetFolder, name));
      } else {
        orphanedAssetKeys = [buildCustomizationStorageKey(assetFolder, assetId)];
      }

      if (kind === "profile_frame") {
        const base = assetId.replace(/\.[a-z0-9]{2,5}$/i, "");
        orphanedAssetKeys.push(buildCustomizationStorageKey(assetFolder, `${base}-divider.webp`));
      }
    }
  }

  const { count, error: invErr } = await admin
    .from("user_inventory")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);

  if (invErr) throw new Error(invErr.message);
  if (count && count > 0 && !options?.confirmInventoryRemoval) {
    throw new Error("Нельзя удалить: предмет есть в инвентаре пользователей");
  }
  if (count && count > 0) {
    const { error: inventoryError } = await admin.from("user_inventory").delete().eq("item_id", itemId);
    if (inventoryError) throw new Error(inventoryError.message);
  }

  const column = item?.equip_slot ? EQUIP_SLOT_COLUMN[item.equip_slot] : undefined;
  if (column && item?.equip_value) {
    const patch: Record<string, unknown> = { [column]: null, updated_at: new Date().toISOString() };
    if (column === "nickname_color") patch.nickname_gradient = false;
    const { error: unequipError } = await admin.from("profile_customization").update(patch).eq(column, item.equip_value);
    if (unequipError) throw new Error(unequipError.message);
  }

  const { error } = await admin.from("shop_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  await Promise.all(orphanedAssetKeys.map((key) => deleteObject({ key, bucket: "public" })));
}

export function validateShopItemInput(input: AdminShopItemInput): void {
  if (!/^[a-z0-9][a-z0-9._-]{0,98}[a-z0-9]$|^[a-z0-9]{1,2}$/.test(input.id)) {
    throw new Error("id: латиница, цифры, дефис (2–100 символов)");
  }
  if (!input.name.trim()) throw new Error("Укажите название");
  if (input.priceRub < 0 || input.priceCoins < 0) throw new Error("Цена не может быть отрицательной");

  const pack = assetPackForKind(input.kind);
  if (pack) {
    const base = normalizeMediaBase(input.equipValue ?? "");
    if (!base) throw new Error("Укажите базовый id (equipValue) для video-пакета");
    return;
  }

  const needsAsset = kindRequiresCdnAsset(input.kind);
  if (needsAsset && !input.assetId?.trim()) {
    throw new Error("Для CDN-предмета укажите assetId или загрузите файл");
  }
}

export type { ShopItemKind, ShopEquipSlot };
