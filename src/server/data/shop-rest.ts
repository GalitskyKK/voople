import { getAdminClient } from "@/lib/supabase/admin";
import { customizationAssetPath } from "@/lib/customization/asset-path";
import {
  SHOP_CATALOG_BY_ID,
  WELCOME_VOOOPS_BONUS,
  type ShopCatalogItem,
} from "@/lib/shop/catalog";
import type {
  EquippedCustomizationView,
  PaymentIntentKind,
  PaymentIntentStatus,
  ShopItemView,
  WalletView,
} from "@/types/shop";

type ShopItemRow = {
  id: string;
  season_id: string | null;
  type: string;
  name: string;
  description: string | null;
  price_rub: number;
  price_coins: number;
  is_free: boolean;
  preview_url: string | null;
  sort_order: number;
  asset_folder: string | null;
  asset_id: string | null;
  equip_slot: string | null;
  equip_value: string | null;
};

type InventoryRow = {
  item_id: string;
};

type WalletRow = {
  balance_coins: number;
};

type CustomizationEquipRow = {
  profile_effect_id: string | null;
  avatar_ring_id: string | null;
  banner_value: unknown;
  avatar_decoration_id: string | null;
  feed_card_style_id: string | null;
  animated_avatar_id: string | null;
  app_theme_id: string | null;
  nickname_color: string | null;
  nickname_gradient: boolean | null;
};

type PaymentIntentRow = {
  id: string;
  user_id: string;
  kind: string;
  amount_rub: number;
  status: string;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
};

function resolvePreviewUrl(row: ShopItemRow): string | null {
  if (row.preview_url) return row.preview_url;
  const catalog = SHOP_CATALOG_BY_ID.get(row.id);
  const folder = row.asset_folder ?? catalog?.assetFolder;
  const assetId = row.asset_id ?? catalog?.assetId;
  if (!folder || !assetId) return null;
  return customizationAssetPath(folder, assetId);
}

function bannerIdFromValue(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { id?: string };
  return record.id ?? null;
}

export async function listShopItemsRest(): Promise<ShopItemRow[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select(
      "id, season_id, type, name, description, price_rub, price_coins, is_free, preview_url, sort_order, asset_folder, asset_id, equip_slot, equip_value",
    )
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ShopItemRow[];
}

export async function getInventoryItemIdsRest(userId: string): Promise<Set<string>> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row: InventoryRow) => row.item_id));
}

export async function getEquippedCustomizationRest(userId: string): Promise<EquippedCustomizationView> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("profile_customization")
    .select(
      "profile_effect_id, avatar_ring_id, banner_value, avatar_decoration_id, feed_card_style_id, animated_avatar_id, app_theme_id, nickname_color, nickname_gradient",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as CustomizationEquipRow | null;

  return {
    profileEffectId: row?.profile_effect_id ?? null,
    avatarRingId: row?.avatar_ring_id ?? null,
    bannerId: bannerIdFromValue(row?.banner_value),
    avatarDecorationId: row?.avatar_decoration_id ?? null,
    feedCardStyleId: row?.feed_card_style_id ?? null,
    animatedAvatarId: row?.animated_avatar_id ?? null,
    appThemeId: row?.app_theme_id ?? null,
    nicknameColor: row?.nickname_color ?? null,
    nicknameGradient: Boolean(row?.nickname_gradient),
  };
}

function isEquipped(row: ShopItemRow, equipped: EquippedCustomizationView): boolean {
  const catalog = SHOP_CATALOG_BY_ID.get(row.id);
  const slot = row.equip_slot ?? catalog?.equipSlot;
  const value = row.equip_value ?? catalog?.equipValue;
  if (!slot || !value) return false;

  switch (slot) {
    case "profile_effect_id":
      return equipped.profileEffectId === value;
    case "avatar_ring_id":
      return equipped.avatarRingId === value;
    case "banner":
      return equipped.bannerId === value;
    case "avatar_decoration_id":
      return equipped.avatarDecorationId === value;
    case "feed_card_style_id":
      return equipped.feedCardStyleId === value;
    case "animated_avatar_id":
      return equipped.animatedAvatarId === value;
    case "app_theme_id":
      return equipped.appThemeId === value;
    case "nickname_style":
      return equipped.nicknameColor === value && equipped.nicknameGradient;
    default:
      return false;
  }
}

export function mapShopItemRow(
  row: ShopItemRow,
  ownedIds: Set<string>,
  equipped: EquippedCustomizationView,
): ShopItemView {
  const catalog = SHOP_CATALOG_BY_ID.get(row.id);
  const kind = (catalog?.kind ?? row.type) as ShopItemView["kind"];

  return {
    id: row.id,
    kind,
    name: row.name,
    description: row.description,
    previewUrl: resolvePreviewUrl(row),
    priceCoins: row.price_coins,
    priceRub: row.price_rub,
    isFree: row.is_free,
    owned: ownedIds.has(row.id),
    equipped: isEquipped(row, equipped),
    equipSlot: (row.equip_slot ?? catalog?.equipSlot ?? "profile_effect_id") as ShopItemView["equipSlot"],
    seasonId: row.season_id,
  };
}

export async function getOrCreateWalletRest(userId: string): Promise<WalletView> {
  const admin = getAdminClient();
  const { data: existing, error: readErr } = await admin
    .from("user_wallets")
    .select("balance_coins")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);
  if (existing) {
    return { balanceCoins: (existing as WalletRow).balance_coins };
  }

  const { data: created, error: insertErr } = await admin
    .from("user_wallets")
    .insert({ user_id: userId, balance_coins: WELCOME_VOOOPS_BONUS })
    .select("balance_coins")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  const { error: txErr } = await admin.from("wallet_transactions").insert({
    user_id: userId,
    amount: WELCOME_VOOOPS_BONUS,
    balance_after: WELCOME_VOOOPS_BONUS,
    kind: "earn",
    reference_type: "welcome_bonus",
    note: "Приветственный бонус",
  });

  if (txErr) throw new Error(txErr.message);

  return { balanceCoins: (created as WalletRow).balance_coins };
}

export async function getShopItemRowRest(itemId: string): Promise<ShopItemRow | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select(
      "id, season_id, type, name, description, price_rub, price_coins, is_free, preview_url, sort_order, asset_folder, asset_id, equip_slot, equip_value",
    )
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ShopItemRow | null;
}

export async function grantInventoryItemRest(
  userId: string,
  itemId: string,
  acquiredVia: "free_claim" | "purchase" | "earned" | "gifted" | "seasonal_reward",
) {
  const admin = getAdminClient();
  const { data: existing, error: findErr } = await admin
    .from("user_inventory")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (existing) return { alreadyOwned: true as const };

  const { error: insertErr } = await admin.from("user_inventory").insert({
    user_id: userId,
    item_id: itemId,
    acquired_via: acquiredVia,
  });

  if (insertErr) throw new Error(insertErr.message);
  return { alreadyOwned: false as const };
}

export async function creditWalletRest(
  userId: string,
  amount: number,
  reference: { type: string; id: string; note?: string },
): Promise<WalletView> {
  if (amount <= 0) throw new Error("Сумма начисления должна быть больше нуля");

  const wallet = await getOrCreateWalletRest(userId);
  const balanceAfter = wallet.balanceCoins + amount;
  const admin = getAdminClient();

  const { error: updateErr } = await admin
    .from("user_wallets")
    .update({ balance_coins: balanceAfter, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (updateErr) throw new Error(updateErr.message);

  const { error: txErr } = await admin.from("wallet_transactions").insert({
    user_id: userId,
    amount,
    balance_after: balanceAfter,
    kind: "earn",
    reference_type: reference.type,
    reference_id: reference.id,
    note: reference.note ?? null,
  });

  if (txErr) throw new Error(txErr.message);

  return { balanceCoins: balanceAfter };
}

export async function debitWalletRest(
  userId: string,
  amount: number,
  reference: { type: string; id: string; note?: string },
): Promise<WalletView> {
  if (amount <= 0) throw new Error("Сумма списания должна быть больше нуля");

  const wallet = await getOrCreateWalletRest(userId);
  if (wallet.balanceCoins < amount) {
    throw new Error("Недостаточно voops");
  }

  const balanceAfter = wallet.balanceCoins - amount;
  const admin = getAdminClient();

  const { error: updateErr } = await admin
    .from("user_wallets")
    .update({ balance_coins: balanceAfter, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (updateErr) throw new Error(updateErr.message);

  const { error: txErr } = await admin.from("wallet_transactions").insert({
    user_id: userId,
    amount: -amount,
    balance_after: balanceAfter,
    kind: "spend",
    reference_type: reference.type,
    reference_id: reference.id,
    note: reference.note ?? null,
  });

  if (txErr) throw new Error(txErr.message);

  return { balanceCoins: balanceAfter };
}

export async function createPaymentIntentRest(input: {
  userId: string;
  kind: PaymentIntentKind;
  amountRub: number;
  metadata?: Record<string, unknown>;
}) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("payment_intents")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      amount_rub: input.amountRub,
      status: "pending",
      provider: "yookassa",
      metadata: input.metadata ?? {},
    })
    .select("id, kind, amount_rub, status, external_id, metadata")
    .single();

  if (error) throw new Error(error.message);
  return data as PaymentIntentRow;
}

export async function getPaymentIntentRest(intentId: string): Promise<PaymentIntentRow | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("payment_intents")
    .select("id, user_id, kind, amount_rub, status, external_id, metadata")
    .eq("id", intentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PaymentIntentRow | null;
}

export async function updatePaymentIntentStatusRest(
  intentId: string,
  status: PaymentIntentStatus,
  externalId?: string,
) {
  const admin = getAdminClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (externalId) patch.external_id = externalId;

  const { error } = await admin.from("payment_intents").update(patch).eq("id", intentId);
  if (error) throw new Error(error.message);
}

export async function linkPaymentIntentExternalRest(intentId: string, externalId: string) {
  const admin = getAdminClient();
  const { error } = await admin
    .from("payment_intents")
    .update({ external_id: externalId, updated_at: new Date().toISOString() })
    .eq("id", intentId);

  if (error) throw new Error(error.message);
}

export function catalogItemForRow(row: ShopItemRow): ShopCatalogItem | undefined {
  return SHOP_CATALOG_BY_ID.get(row.id);
}
