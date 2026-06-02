import type { PromoKind } from "@/types/promo";

export const PROMO_KINDS: PromoKind[] = [
  "plus_trial",
  "subscription_discount",
  "grant_item",
  "voops_bonus",
];

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isPromoKind(value: string): value is PromoKind {
  return (PROMO_KINDS as string[]).includes(value);
}
