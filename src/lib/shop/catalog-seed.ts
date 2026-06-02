import { SHOP_CATALOG, shopItemDbType, type ShopCatalogItem } from "@/lib/shop/catalog";

function sqlString(value: string | undefined | null): string {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function catalogRowSql(item: ShopCatalogItem): string {
  const parts = [
    sqlString(item.id),
    sqlString(item.seasonId ?? "launch"),
    sqlString(shopItemDbType(item.kind)),
    sqlString(item.name),
    sqlString(item.description),
    String(item.priceRub),
    String(item.priceCoins),
    item.isFree ? "true" : "false",
    "NULL",
    String(item.sortOrder),
    sqlString(item.assetFolder),
    sqlString(item.assetId),
    sqlString(item.equipSlot),
    sqlString(item.equipValue),
  ];
  return `  (${parts.join(", ")})`;
}

/** SQL upsert для `shop_items` из `SHOP_CATALOG`. */
export function buildShopCatalogUpsertSql(): string {
  const values = SHOP_CATALOG.map(catalogRowSql).join(",\n");
  return `-- Generated from src/lib/shop/catalog.ts — do not edit by hand
INSERT INTO public.shop_items (
  id, season_id, type, name, description, price_rub, price_coins, is_free,
  preview_url, sort_order, asset_folder, asset_id, equip_slot, equip_value
) VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
  season_id = EXCLUDED.season_id,
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_rub = EXCLUDED.price_rub,
  price_coins = EXCLUDED.price_coins,
  is_free = EXCLUDED.is_free,
  sort_order = EXCLUDED.sort_order,
  asset_folder = EXCLUDED.asset_folder,
  asset_id = EXCLUDED.asset_id,
  equip_slot = EXCLUDED.equip_slot,
  equip_value = EXCLUDED.equip_value;
`;
}

/** Только upsert — безопасно гонять в Supabase SQL Editor при каждом обновлении каталога. */
export function buildShopCatalogSyncSql(): string {
  return buildShopCatalogUpsertSql();
}
