export type PromoKind =
  | "plus_trial"
  | "subscription_discount"
  | "grant_item"
  | "voops_bonus";

export type PromoPreviewView = {
  code: string;
  kind: PromoKind;
  message: string;
  originalAmountRub: number;
  finalAmountRub: number;
  discountRub: number;
};

export type PromoRedeemView = {
  message: string;
  kind: PromoKind;
};
