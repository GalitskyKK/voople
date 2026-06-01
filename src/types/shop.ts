import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";

export type ShopItemView = {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string | null;
  previewUrl: string | null;
  priceCoins: number;
  priceRub: number;
  isFree: boolean;
  owned: boolean;
  equipped: boolean;
  equipSlot: ShopEquipSlot;
  seasonId: string | null;
};

export type WalletView = {
  balanceCoins: number;
};

export type WalletTransactionView = {
  id: string;
  amount: number;
  balanceAfter: number;
  kind: string;
  note: string | null;
  createdAt: string;
};

export type PaymentIntentKind = "shop_item" | "coin_pack" | "donation";

export type PaymentIntentStatus = "pending" | "succeeded" | "canceled" | "failed";

export type PaymentIntentView = {
  id: string;
  kind: PaymentIntentKind;
  amountRub: number;
  status: PaymentIntentStatus;
  checkoutUrl: string | null;
  message: string | null;
};

export type EquippedCustomizationView = {
  profileEffectId: string | null;
  avatarRingId: string | null;
  bannerId: string | null;
  avatarDecorationId: string | null;
  feedCardStyleId: string | null;
  animatedAvatarId: string | null;
  appThemeId: string | null;
  nicknameColor: string | null;
  nicknameGradient: boolean;
};

export type ShopOverviewView = {
  wallet: WalletView;
  items: ShopItemView[];
  equipped: EquippedCustomizationView;
  inventoryIds: string[];
};
