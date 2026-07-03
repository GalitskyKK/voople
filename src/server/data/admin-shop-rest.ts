import { getAdminClient } from "@/lib/supabase/admin";
import {
  assetPackForKind,
  normalizeMediaBase,
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
  const equipValue = pack ? mediaBase || input.equipValue?.trim() || null : input.equipValue?.trim() || null;
  const assetId = pack
    ? mediaBase
      ? posterAssetIdForBase(mediaBase, pack)
      : input.assetId?.trim() || null
    : input.assetId?.trim() || null;

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

  const { data, error } = await admin
    .from("shop_items")
    .update(row)
    .eq("id", itemId)
    .select(SHOP_ITEM_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return rowToRecord(data as ShopItemRow);
}

export async function deleteAdminShopItemRest(itemId: string): Promise<void> {
  const admin = getAdminClient();

  const { count, error: invErr } = await admin
    .from("user_inventory")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);

  if (invErr) throw new Error(invErr.message);
  if (count && count > 0) {
    throw new Error("Нельзя удалить: предмет есть в инвентаре пользователей");
  }

  const { error } = await admin.from("shop_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
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
