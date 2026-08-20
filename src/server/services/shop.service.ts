import {
  DEFAULT_VOOPLUS_PLAN_ID,
  getVooplePlusPlan,
  type VooplePlusPlanId,
} from "@/lib/constants/subscription";
import { isYooKassaConfigured } from "@/lib/payments/yookassa-config";
import {
  createPaymentIntentRest,
  getEquippedCustomizationRest,
  getInventoryItemIdsRest,
  getOrCreateWalletRest,
  getPaymentIntentRest,
  getShopItemRowRest,
  grantInventoryItemRest,
  linkPaymentIntentExternalRest,
  listShopItemsRest,
  mapShopItemRow,
  purchaseShopItemWithCoinsRest,
  updatePaymentIntentStatusRest,
} from "@/server/data/shop-rest";
import { getOrCreateDirectChatRest } from "@/server/data/chat-management-rest";
import { sendMessageRest } from "@/server/data/chat-rest";
import { extendVooplePlusRest, getSubscriptionStatusRest } from "@/server/data/subscription-rest";
import { createYooKassaPayment } from "@/server/integrations/yookassa-client";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  finalizeSubscriptionPromoRedemption,
  resolveSubscriptionPromo,
} from "@/server/services/promo.service";
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

  return purchaseShopItemWithCoinsRest(userId, itemId);
}

export async function createRubPaymentIntent(input: {
  userId: string;
  kind: "shop_item" | "coin_pack" | "donation" | "subscription";
  amountRub?: number;
  itemId?: string;
  recipientId?: string;
  giftMessage?: string;
  promoCode?: string;
  subscriptionPlan?: VooplePlusPlanId;
}): Promise<PaymentIntentView> {
  let amountRub: number;
  let description: string;
  const metadata: Record<string, unknown> = {};

  if (input.kind === "subscription") {
    const plan = getVooplePlusPlan(input.subscriptionPlan ?? DEFAULT_VOOPLUS_PLAN_ID);
    const pricing = await resolveSubscriptionPromo(input.userId, input.promoCode, plan.id);
    amountRub = pricing.amountRub;
    description =
      pricing.discountRub != null
        ? `Подписка Voople+ (скидка ${pricing.discountRub} ₽)`
        : `Подписка Voople+ — ${plan.label.toLocaleLowerCase("ru-RU")}`;
    metadata.subscriptionPlan = plan.id;
    metadata.basePriceRub = plan.priceRub;
    if (pricing.promoCodeId) metadata.promoCodeId = pricing.promoCodeId;
  } else if (input.kind === "shop_item") {
    if (!input.itemId) throw new Error("Не указан предмет");
    const row = await getShopItemRowRest(input.itemId);
    if (!row) throw new Error("Предмет не найден");
    if (row.is_free) throw new Error("Предмет бесплатный — получите в каталоге");
    if (row.price_rub <= 0) throw new Error("Предмет недоступен за рубли");

    if (input.recipientId === input.userId) throw new Error("Нельзя отправить подарок самому себе");
    const inventoryOwnerId = input.recipientId ?? input.userId;
    if (input.recipientId) {
      const { data: recipient, error: recipientError } = await getAdminClient()
        .from("users")
        .select("id")
        .eq("id", input.recipientId)
        .maybeSingle();
      if (recipientError) throw new Error(recipientError.message);
      if (!recipient) throw new Error("Получатель не найден");
    }
    const owned = await getInventoryItemIdsRest(inventoryOwnerId);
    if (owned.has(input.itemId)) throw new Error("Предмет уже в инвентаре");

    amountRub = row.price_rub;
    description = `Покупка: ${row.name}`;
    metadata.itemId = input.itemId;
    if (input.recipientId) {
      metadata.giftRecipientId = input.recipientId;
      metadata.giftMessage = input.giftMessage?.trim().slice(0, 280) || null;
      description = `Подарок: ${row.name}`;
    }
  } else {
    amountRub = input.amountRub ?? 0;
    if (amountRub < 1) throw new Error("Минимальная сумма — 1 ₽");
    if (input.itemId) metadata.itemId = input.itemId;
    description =
      input.kind === "donation" ? "Добровольная поддержка Voople" : "Покупка voops";
  }

  const intent = await createPaymentIntentRest({
    userId: input.userId,
    kind: input.kind,
    amountRub,
    metadata,
  });

  if (!isYooKassaConfigured()) {
    return {
      id: intent.id,
      kind: intent.kind as PaymentIntentView["kind"],
      amountRub: intent.amount_rub,
      status: intent.status as PaymentIntentView["status"],
      checkoutUrl: null,
      message:
        "Платёж сохранён. Добавьте YOO_KASSA_SHOP_ID и YOO_KASSA_SECRET_KEY для перехода на оплату.",
    };
  }

  const payment = await createYooKassaPayment({
    amountRub,
    description,
    metadata: {
      paymentIntentId: intent.id,
      userId: input.userId,
      kind: input.kind,
    },
  });

  await linkPaymentIntentExternalRest(intent.id, payment.id);

  const checkoutUrl = payment.confirmation?.confirmation_url ?? null;
  if (!checkoutUrl) {
    throw new Error("ЮKassa не вернула ссылку на оплату");
  }

  return {
    id: intent.id,
    kind: intent.kind as PaymentIntentView["kind"],
    amountRub: intent.amount_rub,
    status: intent.status as PaymentIntentView["status"],
    checkoutUrl,
    message: null,
  };
}

/** Идемпотентное начисление после успешной оплаты (webhook YooKassa). */
export async function fulfillSucceededPaymentIntent(intentId: string, externalId?: string) {
  const intent = await getPaymentIntentRest(intentId);
  if (!intent) return;
  if (intent.status === "succeeded") return;
  if (externalId && intent.external_id && intent.external_id !== externalId) {
    throw new Error("Платёж не соответствует созданному намерению");
  }

  const userId = intent.user_id;
  const metadata = intent.metadata ?? {};

  if (intent.kind === "shop_item") {
    const itemId = metadata.itemId;
    if (typeof itemId !== "string" || !itemId) {
      throw new Error("В intent нет itemId");
    }
    const row = await getShopItemRowRest(itemId);
    if (!row) throw new Error("Предмет не найден");
    if (intent.amount_rub !== row.price_rub) {
      throw new Error("Сумма платежа не совпадает с ценой предмета");
    }
    const giftRecipientId = typeof metadata.giftRecipientId === "string" ? metadata.giftRecipientId : null;
    const inventoryOwnerId = giftRecipientId ?? userId;
    await grantInventoryItemRest(inventoryOwnerId, itemId, giftRecipientId ? "gifted" : "purchase");
    if (giftRecipientId) {
      const chatId = await getOrCreateDirectChatRest(userId, giftRecipientId);
      const giftMessage = typeof metadata.giftMessage === "string" ? metadata.giftMessage : null;
      await sendMessageRest({
        chatId,
        senderId: userId,
        messageId: intent.id,
        text: `🎁 Подарок: ${row.name}${giftMessage ? ` — ${giftMessage}` : ""}`,
        storedContent: [{ type: "gift", itemId, itemName: row.name, message: giftMessage }],
      });
    }
  }

  if (intent.kind === "subscription") {
    const rawPlan = metadata.subscriptionPlan;
    const subscriptionPlan = rawPlan === "annual" ? "annual" : DEFAULT_VOOPLUS_PLAN_ID;
    const plan = getVooplePlusPlan(subscriptionPlan);
    if (intent.amount_rub < 1 || intent.amount_rub > plan.priceRub) {
      throw new Error("Сумма платежа не совпадает с ценой подписки");
    }
    const paymentId = externalId ?? intent.external_id;
    if (!paymentId) throw new Error("Нет ID платежа ЮKassa");
    await extendVooplePlusRest(userId, paymentId, plan.periodDays);

    const promoCodeId = metadata.promoCodeId;
    if (typeof promoCodeId === "string" && promoCodeId) {
      await finalizeSubscriptionPromoRedemption(userId, promoCodeId, intentId);
    }
  }

  if (intent.kind === "coin_pack") {
    throw new Error("Пакеты voops ещё не настроены");
  }

  await updatePaymentIntentStatusRest(intentId, "succeeded", externalId);
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

export { getSubscriptionStatusRest as getSubscriptionStatus };
