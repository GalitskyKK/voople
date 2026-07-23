import { getAdminClient } from "@/lib/supabase/admin";
import { clearExpiredSubscriptionCustomizationRest } from "@/server/data/subscription-rest";
import { customizationAssetPath } from "@/lib/customization/asset-path";
import {
  SHOP_CATALOG_BY_ID,
  WELCOME_VOOOPS_BONUS,
  type ShopCatalogItem,
} from "@/lib/shop/catalog";
import {
  resolveRowAssetFolder,
  resolveRowAssetId,
  resolveRowEquipSlot,
  resolveRowEquipValue,
  resolveRowKind,
  SHOP_ITEM_SELECT,
  shopPreviewItemFromRow,
  type ShopItemRow,
} from "@/lib/shop/item-row";
import type {
  EquippedCustomizationView,
  PaymentIntentKind,
  PaymentIntentStatus,
  ShopItemView,
  WalletView,
} from "@/types/shop";

type InventoryRow = {
  item_id: string;
};

type WalletRow = {
  balance_coins: number;
};

type CustomizationEquipRow = {
  profile_effect_id: string | null;
  profile_background_id: string | null;
  profile_frame_id: string | null;
  frame_color: string | null;
  card_base_mode: string | null;
  avatar_ring_id: string | null;
  banner_value: unknown;
  avatar_decoration_id: string | null;
  feed_card_style_id: string | null;
  animated_avatar_id: string | null;
  app_theme_id: string | null;
  nickname_color: string | null;
  nickname_gradient: boolean | null;
  nickname_font: string | null;
  nickname_effect: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
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
  const folder = resolveRowAssetFolder(row, catalog);
  const assetId = resolveRowAssetId(row, catalog);
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
    .select(SHOP_ITEM_SELECT)
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
  await clearExpiredSubscriptionCustomizationRest(userId);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("profile_customization")
    .select(
      "profile_effect_id, profile_background_id, profile_frame_id, frame_color, card_base_mode, avatar_ring_id, banner_value, avatar_decoration_id, feed_card_style_id, animated_avatar_id, app_theme_id, nickname_color, nickname_gradient, nickname_font, nickname_effect, theme_primary, theme_accent",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as CustomizationEquipRow | null;

  return {
    profileEffectId: row?.profile_effect_id ?? null,
    profileBackgroundId: row?.profile_background_id ?? null,
    profileFrameId: row?.profile_frame_id ?? null,
    frameColor: row?.frame_color ?? null,
    cardBaseMode: row?.card_base_mode ?? null,
    avatarRingId: row?.avatar_ring_id ?? null,
    bannerId: bannerIdFromValue(row?.banner_value),
    avatarDecorationId: row?.avatar_decoration_id ?? null,
    feedCardStyleId: row?.feed_card_style_id ?? null,
    animatedAvatarId: row?.animated_avatar_id ?? null,
    appThemeId: row?.app_theme_id ?? null,
    nicknameColor: row?.nickname_color ?? null,
    nicknameGradient: Boolean(row?.nickname_gradient),
    nicknameFont: row?.nickname_font ?? "sans",
    nicknameEffect: row?.nickname_effect ?? (row?.nickname_gradient ? "gradient" : "plain"),
    themePrimary: row?.theme_primary ?? null,
    themeAccent: row?.theme_accent ?? null,
  };
}

function isEquipped(row: ShopItemRow, equipped: EquippedCustomizationView): boolean {
  const catalog = SHOP_CATALOG_BY_ID.get(row.id);
  const slot = resolveRowEquipSlot(row, catalog);
  const value = resolveRowEquipValue(row, catalog);
  if (!slot || !value) return false;

  switch (slot) {
    case "profile_effect_id":
      return equipped.profileEffectId === value;
    case "profile_background_id":
      return equipped.profileBackgroundId === value;
    case "profile_frame_id":
      return equipped.profileFrameId === value;
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
  const kind = resolveRowKind(row, catalog?.kind);
  const previewMeta = shopPreviewItemFromRow(row, catalog);

  return {
    id: row.id,
    kind,
    name: row.name,
    description: row.description,
    previewUrl: resolvePreviewUrl(row),
    previewMeta,
    priceCoins: row.price_coins,
    priceRub: row.price_rub,
    isFree: row.is_free,
    owned: ownedIds.has(row.id),
    equipped: isEquipped(row, equipped),
    equipSlot: resolveRowEquipSlot(row, catalog),
    equipValue: resolveRowEquipValue(row, catalog),
    seasonId: row.season_id,
    assetFolder: resolveRowAssetFolder(row, catalog),
    assetId: resolveRowAssetId(row, catalog),
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
    .select(SHOP_ITEM_SELECT)
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

  const admin = getAdminClient();
  let balanceAfter: number | null = null;
  for (let attempt = 0; attempt < 5 && balanceAfter === null; attempt += 1) {
    const wallet = await getOrCreateWalletRest(userId);
    const nextBalance = wallet.balanceCoins + amount;
    const { data, error: updateErr } = await admin
      .from("user_wallets")
      .update({ balance_coins: nextBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("balance_coins", wallet.balanceCoins)
      .select("balance_coins")
      .maybeSingle();
    if (updateErr) throw new Error(updateErr.message);
    if (data) balanceAfter = (data as WalletRow).balance_coins;
  }
  if (balanceAfter === null) throw new Error("Баланс изменился одновременно, повторите операцию");

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

  const admin = getAdminClient();
  let balanceAfter: number | null = null;
  for (let attempt = 0; attempt < 5 && balanceAfter === null; attempt += 1) {
    const wallet = await getOrCreateWalletRest(userId);
    if (wallet.balanceCoins < amount) throw new Error("Недостаточно voops");
    const nextBalance = wallet.balanceCoins - amount;
    const { data, error: updateErr } = await admin
      .from("user_wallets")
      .update({ balance_coins: nextBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("balance_coins", wallet.balanceCoins)
      .select("balance_coins")
      .maybeSingle();
    if (updateErr) throw new Error(updateErr.message);
    if (data) balanceAfter = (data as WalletRow).balance_coins;
  }
  if (balanceAfter === null) throw new Error("Баланс изменился одновременно, повторите операцию");

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
