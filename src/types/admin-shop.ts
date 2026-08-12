import type { ShopEquipSlot, ShopItemKind } from "@/lib/shop/catalog";

/** Полная запись каталога из БД (источник правды для админки и runtime). */
export type AdminShopItemRecord = {
  id: string;
  seasonId: string | null;
  kind: ShopItemKind;
  dbType: string;
  name: string;
  description: string | null;
  priceRub: number;
  priceCoins: number;
  isFree: boolean;
  previewUrl: string | null;
  sortOrder: number;
  assetFolder: string | null;
  assetId: string | null;
  equipSlot: ShopEquipSlot;
  equipValue: string | null;
  requiresSubscription: boolean;
};

export type AdminShopItemInput = {
  id: string;
  seasonId?: string | null;
  kind: ShopItemKind;
  name: string;
  description?: string | null;
  priceRub: number;
  priceCoins: number;
  isFree: boolean;
  previewUrl?: string | null;
  sortOrder: number;
  assetFolder?: string | null;
  assetId?: string | null;
  equipSlot: ShopEquipSlot;
  equipValue?: string | null;
  requiresSubscription: boolean;
};

export type AdminAssetUploadView = {
  storageKey: string;
  uploadUrl: string;
  publicUrl: string;
  assetFolder: string;
  assetId: string;
  expiresIn: number;
};
