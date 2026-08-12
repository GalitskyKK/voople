import type { ShopCatalogItem, ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";
import { kindFromDbType } from "@/lib/shop/defaults";

export type ShopItemRow = {
  id: string;
  season_id: string | null;
  type: string;
  kind: string | null;
  name: string;
  description: string | null;
  price_rub: number;
  price_coins: number;
  is_free: boolean;
  preview_url: string | null;
  sort_order: number;
  asset_folder: string | null;
  asset_id: string | null;
  equip_slot: string | null;
  equip_value: string | null;
  requires_subscription: "plus" | "pro" | null;
};

export const SHOP_ITEM_SELECT =
  "id, season_id, type, kind, name, description, price_rub, price_coins, is_free, preview_url, sort_order, asset_folder, asset_id, equip_slot, equip_value, requires_subscription";

export function resolveRowKind(row: ShopItemRow, catalogKind?: ShopItemKind): ShopItemKind {
  if (row.kind) return row.kind as ShopItemKind;
  if (catalogKind) return catalogKind;
  return kindFromDbType(row.type, row.id);
}

export function resolveRowEquipSlot(row: ShopItemRow, catalog?: ShopCatalogItem): ShopEquipSlot {
  return (row.equip_slot ?? catalog?.equipSlot ?? "profile_effect_id") as ShopEquipSlot;
}

export function resolveRowEquipValue(row: ShopItemRow, catalog?: ShopCatalogItem): string | null {
  return row.equip_value ?? catalog?.equipValue ?? null;
}

export function resolveRowAssetFolder(row: ShopItemRow, catalog?: ShopCatalogItem): string | null {
  return row.asset_folder ?? catalog?.assetFolder ?? null;
}

export function resolveRowAssetId(row: ShopItemRow, catalog?: ShopCatalogItem): string | null {
  return row.asset_id ?? catalog?.assetId ?? null;
}

/** Минимальный набор полей для превью в магазине (CDN + CSS). */
export function shopPreviewItemFromRow(
  row: ShopItemRow,
  catalog?: ShopCatalogItem,
): Pick<ShopCatalogItem, "kind" | "name" | "assetFolder" | "assetId" | "equipValue"> {
  const kind = resolveRowKind(row, catalog?.kind);
  const assetFolder = resolveRowAssetFolder(row, catalog) ?? undefined;
  const assetId = resolveRowAssetId(row, catalog) ?? undefined;
  const equipValue = resolveRowEquipValue(row, catalog) ?? undefined;

  return {
    kind,
    name: row.name,
    assetFolder,
    assetId,
    equipValue,
  };
}
