import type { ShopPreviewFields } from "@/lib/shop/catalog-delivery";
import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";

export type ShopItemPreviewMeta = ShopPreviewFields;

export type ShopItemView = {
  id: string;
  kind: ShopItemKind;
  name: string;
  description: string | null;
  previewUrl: string | null;
  previewMeta: ShopItemPreviewMeta;
  priceCoins: number;
  priceRub: number;
  isFree: boolean;
  owned: boolean;
  equipped: boolean;
  equipSlot: ShopEquipSlot;
  equipValue: string | null;
  seasonId: string | null;
  assetFolder: string | null;
  assetId: string | null;
  /** Предмет можно получить отдельно, но использовать только при активной подписке. */
  requiresSubscription: boolean;
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

export type PaymentIntentKind = "shop_item" | "coin_pack" | "donation" | "subscription";

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
  profileBackgroundId: string | null;
  /** Рамка карточки (id пресета frames-registry / картиночной рамки). */
  profileFrameId: string | null;
  /** Кастомный цвет рамки (Voople+), HEX. */
  frameColor: string | null;
  /** Режим основы карточки: mirror | theme | plain. */
  cardBaseMode: string | null;
  avatarRingId: string | null;
  bannerId: string | null;
  avatarDecorationId: string | null;
  feedCardStyleId: string | null;
  animatedAvatarId: string | null;
  appThemeId: string | null;
  nicknameColor: string | null;
  nicknameGradient: boolean;
  nicknameFont: string | null;
  nicknameEffect: string | null;
  /** Тема профиля (два цвета градиента карточки). Доступна с Voople+. */
  themePrimary: string | null;
  themeAccent: string | null;
};

export type ShopOverviewView = {
  wallet: WalletView;
  items: ShopItemView[];
  equipped: EquippedCustomizationView;
  inventoryIds: string[];
};
