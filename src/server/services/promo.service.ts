import { VOOPLUS_PRICE_RUB } from "@/lib/constants/subscription";
import { normalizePromoCode } from "@/lib/promo/kinds";
import {
  assertPromoRowEligible,
  countUserPromoRedemptionsRest,
  getPromoByCodeRest,
  getPromoByIdRest,
  parsePromoPayload,
  recordPromoRedemptionRest,
  type PromoCodeRow,
} from "@/server/data/promo-rest";
import {
  creditWalletRest,
  getInventoryItemIdsRest,
  getShopItemRowRest,
  grantInventoryItemRest,
} from "@/server/data/shop-rest";
import { extendVooplePlusRest } from "@/server/data/subscription-rest";
import type { PromoKind, PromoPreviewView, PromoRedeemView } from "@/types/promo";
import type { SubscriptionStatusView } from "@/types/subscription";

async function loadEligiblePromo(userId: string, rawCode: string): Promise<PromoCodeRow> {
  const promo = await getPromoByCodeRest(rawCode);
  if (!promo) throw new Error("Промокод не найден");

  const used = await countUserPromoRedemptionsRest(promo.id, userId);
  assertPromoRowEligible(promo, used);
  return promo;
}

export async function previewSubscriptionPromo(
  userId: string,
  rawCode: string,
): Promise<PromoPreviewView> {
  const promo = await loadEligiblePromo(userId, rawCode);
  if (promo.kind !== "subscription_discount") {
    throw new Error("Этот промокод применяется кнопкой «Активировать», а не при оплате");
  }

  const { discountRub } = parsePromoPayload("subscription_discount", promo.payload);
  const finalAmountRub = Math.max(VOOPLUS_PRICE_RUB - discountRub, 1);

  return {
    code: normalizePromoCode(rawCode),
    kind: "subscription_discount",
    message: `Скидка ${discountRub} ₽ на подписку`,
    originalAmountRub: VOOPLUS_PRICE_RUB,
    finalAmountRub,
    discountRub,
  };
}

export async function redeemInstantPromo(userId: string, rawCode: string): Promise<{
  result: PromoRedeemView;
  subscription?: SubscriptionStatusView;
}> {
  const promo = await loadEligiblePromo(userId, rawCode);
  const kind = promo.kind as PromoKind;

  if (kind === "subscription_discount") {
    throw new Error("Скидочный промокод вводите перед оплатой подписки");
  }

  const redemptionId = await recordPromoRedemptionRest({
    promoCodeId: promo.id,
    userId,
    referenceType: "promo_redeem",
    referenceId: promo.code,
  });

  if (kind === "plus_trial") {
    const { days } = parsePromoPayload(kind, promo.payload);
    const subscription = await extendVooplePlusRest(
      userId,
      `promo:${redemptionId}`,
      days,
      "promo",
    );
    return {
      result: {
        kind,
        message: `Voople+ активирован на ${days} дн.`,
      },
      subscription,
    };
  }

  if (kind === "grant_item") {
    const { itemId } = parsePromoPayload(kind, promo.payload);
    const row = await getShopItemRowRest(itemId);
    if (!row) throw new Error("Предмет из промокода не найден");
    const owned = await getInventoryItemIdsRest(userId);
    if (!owned.has(itemId)) {
      await grantInventoryItemRest(userId, itemId, "gifted");
    }
    return {
      result: {
        kind,
        message: `Предмет «${row.name}» добавлен в инвентарь`,
      },
    };
  }

  if (kind === "voops_bonus") {
    const { amount } = parsePromoPayload(kind, promo.payload);
    await creditWalletRest(userId, amount, {
      type: "promo_code",
      id: promo.id,
      idempotencyKey: `promo:${promo.id}:${userId}`,
      note: `Промокод ${promo.code}`,
    });
    return {
      result: {
        kind,
        message: `Начислено ${amount} voops`,
      },
    };
  }

  throw new Error("Промокод не поддерживается");
}

export async function resolveSubscriptionPromo(
  userId: string,
  rawCode: string | undefined,
): Promise<{ amountRub: number; promoCodeId?: string; discountRub?: number }> {
  if (!rawCode?.trim()) {
    return { amountRub: VOOPLUS_PRICE_RUB };
  }

  const promo = await loadEligiblePromo(userId, rawCode);
  if (promo.kind !== "subscription_discount") {
    throw new Error("Для оплаты подписки нужен скидочный промокод или активируйте пробный отдельно");
  }

  const { discountRub } = parsePromoPayload("subscription_discount", promo.payload);
  const amountRub = Math.max(VOOPLUS_PRICE_RUB - discountRub, 1);

  return { amountRub, promoCodeId: promo.id, discountRub };
}

export type ApplyPromoResult =
  | { action: "discount"; preview: PromoPreviewView }
  | {
      action: "redeemed";
      result: PromoRedeemView;
      subscription: SubscriptionStatusView | null;
    };

/** Одна кнопка «Применить»: пробный/бонус сразу, скидка — к оплате. */
export async function applyPromoCode(userId: string, rawCode: string): Promise<ApplyPromoResult> {
  const promo = await loadEligiblePromo(userId, rawCode);

  if (promo.kind === "subscription_discount") {
    const preview = await previewSubscriptionPromo(userId, rawCode);
    return { action: "discount", preview };
  }

  const { result, subscription } = await redeemInstantPromo(userId, rawCode);
  return {
    action: "redeemed",
    result,
    subscription: subscription ?? null,
  };
}

/** Списать промокод после успешной оплаты подписки со скидкой. */
export async function finalizeSubscriptionPromoRedemption(
  userId: string,
  promoCodeId: string,
  paymentIntentId: string,
): Promise<void> {
  const promo = await getPromoByIdRest(promoCodeId);
  if (!promo) return;

  const used = await countUserPromoRedemptionsRest(promo.id, userId);
  try {
    assertPromoRowEligible(promo, used);
  } catch {
    return;
  }

  await recordPromoRedemptionRest({
    promoCodeId: promo.id,
    userId,
    referenceType: "payment_intent",
    referenceId: paymentIntentId,
  });
}
