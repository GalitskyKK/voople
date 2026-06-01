import {
  createPaymentIntentRest,
  debitWalletRest,
  getEquippedCustomizationRest,
  getInventoryItemIdsRest,
  getOrCreateWalletRest,
  getShopItemRowRest,
  grantInventoryItemRest,
  listShopItemsRest,
  mapShopItemRow,
} from "@/server/data/shop-rest";
import type {
  PaymentIntentView,
  ShopOverviewView,
  WalletView,
} from "@/types/shop";

export async function getShopOverview(userId: string): Promise<ShopOverviewView> {
  const [wallet, rows, ownedIds, equipped] = await Promise.all([
    getOrCreateWalletRest(userId),
    listShopItemsRest(),
    getInventoryItemIdsRest(userId),
    getEquippedCustomizationRest(userId),
  ]);

  return {
    wallet,
    equipped,
    inventoryIds: [...ownedIds],
    items: rows.map((row) => mapShopItemRow(row, ownedIds, equipped)),
  };
}

export async function claimShopItem(userId: string, itemId: string): Promise<WalletView> {
  const row = await getShopItemRowRest(itemId);
  if (!row) throw new Error("Предмет не найден");
  if (!row.is_free) throw new Error("Предмет нельзя получить бесплатно");

  await grantInventoryItemRest(userId, itemId, "free_claim");
  return getOrCreateWalletRest(userId);
}

export async function purchaseShopItemWithCoins(userId: string, itemId: string): Promise<WalletView> {
  const row = await getShopItemRowRest(itemId);
  if (!row) throw new Error("Предмет не найден");
  if (row.is_free) throw new Error("Используйте бесплатное получение");
  if (row.price_coins <= 0) throw new Error("Предмет недоступен за voops");

  const owned = await getInventoryItemIdsRest(userId);
  if (owned.has(itemId)) throw new Error("Предмет уже в инвентаре");

  await debitWalletRest(userId, row.price_coins, {
    type: "shop_item",
    id: itemId,
    note: `Покупка: ${row.name}`,
  });

  await grantInventoryItemRest(userId, itemId, "purchase");
  return getOrCreateWalletRest(userId);
}

export async function createRubPaymentIntent(input: {
  userId: string;
  kind: "shop_item" | "coin_pack" | "donation";
  amountRub: number;
  itemId?: string;
}): Promise<PaymentIntentView> {
  if (input.amountRub < 1) throw new Error("Минимальная сумма — 1 ₽");

  if (input.kind === "shop_item") {
    if (!input.itemId) throw new Error("Не указан предмет");
    const row = await getShopItemRowRest(input.itemId);
    if (!row) throw new Error("Предмет не найден");
    if (row.price_rub <= 0) throw new Error("Предмет недоступен за рубли");
  }

  const intent = await createPaymentIntentRest({
    userId: input.userId,
    kind: input.kind,
    amountRub: input.amountRub,
    metadata: input.itemId ? { itemId: input.itemId } : {},
  });

  return {
    id: intent.id,
    kind: intent.kind as PaymentIntentView["kind"],
    amountRub: intent.amount_rub,
    status: intent.status as PaymentIntentView["status"],
    checkoutUrl: null,
    message: "Оплата через YooKassa будет подключена на следующем шаге. Intent сохранён.",
  };
}

export async function claimAllFreeItems(userId: string): Promise<ShopOverviewView> {
  const rows = await listShopItemsRest();
  const owned = await getInventoryItemIdsRest(userId);

  for (const row of rows) {
    if (!row.is_free || owned.has(row.id)) continue;
    await grantInventoryItemRest(userId, row.id, "free_claim");
    owned.add(row.id);
  }

  return getShopOverview(userId);
}
