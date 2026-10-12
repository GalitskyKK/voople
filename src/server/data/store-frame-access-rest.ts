import { SHOP_CATALOG_BY_ID } from "@/lib/shop/catalog";
import { resolveRowEquipSlot, resolveRowEquipValue } from "@/lib/shop/item-row";
import { getShopItemRowRest } from "@/server/data/shop-rest";
import { hasActiveSubscriptionRest } from "@/server/data/subscription-rest";

/** Only this migrated slot gains stricter ordinary-update authorization. */
export async function assertOwnsStoreFrame(userId: string, ownedIds: Set<string>, value: string) {
  let gatedMatch = false;
  for (const id of ownedIds) {
    const row = await getShopItemRowRest(id);
    if (!row) continue;
    const catalog = SHOP_CATALOG_BY_ID.get(id);
    if (resolveRowEquipSlot(row, catalog) !== "profile_frame_id" || resolveRowEquipValue(row, catalog) !== value) continue;
    if (!row.requires_subscription) return;
    gatedMatch = true;
  }
  if (!gatedMatch) throw new Error("Рамка не куплена");
  if (!await hasActiveSubscriptionRest(userId)) throw new Error("Рамка из магазина требует подписку Вупл+");
}
