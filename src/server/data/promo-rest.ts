import { getAdminClient } from "@/lib/supabase/admin";
import { isPromoKind, normalizePromoCode } from "@/lib/promo/kinds";
import type { PromoKind } from "@/types/promo";

export type PromoCodeRow = {
  id: string;
  code: string;
  kind: string;
  payload: Record<string, unknown>;
  max_redemptions: number | null;
  redemption_count: number;
  max_per_user: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

export async function getPromoByIdRest(promoCodeId: string): Promise<PromoCodeRow | null> {
  const admin = getAdminClient();
  const { data, error } = await admin.from("promo_codes").select("*").eq("id", promoCodeId).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as PromoCodeRow;
  if (!isPromoKind(row.kind)) return null;
  return row;
}

export async function getPromoByCodeRest(rawCode: string): Promise<PromoCodeRow | null> {
  const code = normalizePromoCode(rawCode);
  if (!code) return null;

  const admin = getAdminClient();
  const { data, error } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as PromoCodeRow;
  if (!isPromoKind(row.kind)) return null;
  return row;
}

export async function countUserPromoRedemptionsRest(
  promoCodeId: string,
  userId: string,
): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from("promo_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function assertPromoRowEligible(
  promo: PromoCodeRow,
  userRedemptionCount: number,
  now: Date = new Date(),
): void {
  if (!promo.is_active) throw new Error("Промокод недействителен");

  if (promo.valid_from && new Date(promo.valid_from) > now) {
    throw new Error("Промокод ещё не активен");
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    throw new Error("Срок действия промокода истёк");
  }
  if (promo.max_redemptions != null && promo.redemption_count >= promo.max_redemptions) {
    throw new Error("Промокод исчерпан");
  }
  if (userRedemptionCount >= promo.max_per_user) {
    throw new Error("Вы уже использовали этот промокод");
  }
}

export async function recordPromoRedemptionRest(input: {
  promoCodeId: string;
  userId: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<string> {
  const { data, error } = await getAdminClient().rpc("claim_promo_redemption", {
    p_promo_code_id: input.promoCodeId,
    p_user_id: input.userId,
    p_reference_type: input.referenceType ?? null,
    p_reference_id: input.referenceId ?? null,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export function parsePromoPayload(
  kind: "plus_trial",
  payload: Record<string, unknown>,
): { days: number };
export function parsePromoPayload(
  kind: "subscription_discount",
  payload: Record<string, unknown>,
): { discountRub: number };
export function parsePromoPayload(
  kind: "grant_item",
  payload: Record<string, unknown>,
): { itemId: string };
export function parsePromoPayload(
  kind: "voops_bonus",
  payload: Record<string, unknown>,
): { amount: number };
export function parsePromoPayload(kind: PromoKind, payload: Record<string, unknown>) {
  switch (kind) {
    case "plus_trial": {
      const days = payload.days;
      if (typeof days !== "number" || days < 1 || days > 365) {
        throw new Error("Некорректный промокод (days)");
      }
      return { days };
    }
    case "subscription_discount": {
      const discountRub = payload.discountRub;
      if (typeof discountRub !== "number" || discountRub < 1) {
        throw new Error("Некорректный промокод (discountRub)");
      }
      return { discountRub };
    }
    case "grant_item": {
      const itemId = payload.itemId;
      if (typeof itemId !== "string" || !itemId) {
        throw new Error("Некорректный промокод (itemId)");
      }
      return { itemId };
    }
    case "voops_bonus": {
      const amount = payload.amount;
      if (typeof amount !== "number" || amount < 1) {
        throw new Error("Некорректный промокод (amount)");
      }
      return { amount };
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Неизвестный тип промокода: ${String(_exhaustive)}`);
    }
  }
}
