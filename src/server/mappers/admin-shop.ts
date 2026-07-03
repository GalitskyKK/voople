import type { ShopItemKind } from "@/lib/shop/catalog";
import { resolveRowEquipSlot, resolveRowKind, type ShopItemRow } from "@/lib/shop/item-row";
import type { AdminShopItemRecord } from "@/types/admin-shop";

export function mapAdminShopItemRecord(row: ShopItemRow): AdminShopItemRecord {
  const kind = resolveRowKind(row);
  return {
    id: row.id,
    seasonId: row.season_id,
    kind,
    dbType: row.type,
    name: row.name,
    description: row.description,
    priceRub: row.price_rub,
    priceCoins: row.price_coins,
    isFree: row.is_free,
    previewUrl: row.preview_url,
    sortOrder: row.sort_order,
    assetFolder: row.asset_folder,
    assetId: row.asset_id,
    equipSlot: resolveRowEquipSlot(row),
    equipValue: row.equip_value,
  };
}

export function isKnownShopKind(value: string): value is ShopItemKind {
  return [
    "effect",
    "ring",
    "banner",
    "nameplate",
    "badge",
    "reaction_pack",
    "decoration",
    "feed_card",
    "animated_avatar",
    "app_theme",
    "nickname_style",
    "profile_background",
  ].includes(value);
}
