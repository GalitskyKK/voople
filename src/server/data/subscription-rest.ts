import { getAdminClient } from "@/lib/supabase/admin";
import { isFreeAppThemeId } from "@/lib/app-themes";
import { VOOPLUS_PERIOD_DAYS } from "@/lib/constants/subscription";
import type { SubscriptionStatusView } from "@/types/subscription";

export type { SubscriptionStatusView };

type SubscriptionRow = {
  tier: string;
  started_at: string;
  expires_at: string;
};

type EquippedRow = {
  profile_effect_id: string | null;
  profile_background_id: string | null;
  profile_frame_id: string | null;
  avatar_ring_id: string | null;
  avatar_decoration_id: string | null;
  feed_card_style_id: string | null;
  animated_avatar_id: string | null;
  app_theme_id: string | null;
  nickname_color: string | null;
  nickname_gradient: boolean | null;
  nickname_font: string | null;
  nickname_effect: string | null;
  frame_color: string | null;
  card_base_mode: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  banner_value: { id?: string; key?: string; url?: string } | null;
};

/**
 * Removes currently equipped subscription-only inventory assets after expiry.
 * Inventory is intentionally retained: renewing restores the right to equip it,
 * while the visible profile always falls back to the default state.
 */
export async function clearExpiredSubscriptionCustomizationRest(userId: string): Promise<void> {
  const subscription = await getSubscriptionRest(userId);
  if (isSubscriptionActive(subscription)) return;

  const admin = getAdminClient();
  const [{ data: customization, error: customizationError }, { data: gatedItems, error: itemsError }] = await Promise.all([
    admin.from("profile_customization").select("profile_effect_id, profile_background_id, profile_frame_id, avatar_ring_id, avatar_decoration_id, feed_card_style_id, animated_avatar_id, app_theme_id, nickname_color, nickname_gradient, nickname_font, nickname_effect, frame_color, card_base_mode, theme_primary, theme_accent, banner_value").eq("user_id", userId).maybeSingle(),
    // `requires_subscription` is a nullable subscription_tier enum (`plus` / `pro`),
    // not a boolean. Any non-null tier is gated when the user has no active plan.
    admin.from("shop_items").select("equip_slot, equip_value").not("requires_subscription", "is", null),
  ]);
  if (customizationError) throw new Error(customizationError.message);
  if (itemsError) throw new Error(itemsError.message);
  const row = customization as EquippedRow | null;
  if (!row) return;

  const gated = new Set((gatedItems ?? []).map((item) => `${item.equip_slot}:${item.equip_value}`));
  const update: Record<string, unknown> = {};
  if (row.frame_color) update.frame_color = null;
  if (row.card_base_mode && row.card_base_mode !== "mirror") update.card_base_mode = "mirror";
  if (row.theme_primary) update.theme_primary = null;
  if (row.theme_accent) update.theme_accent = null;
  if (row.nickname_font && row.nickname_font !== "sans") update.nickname_font = "sans";
  if (row.nickname_effect && row.nickname_effect !== "plain") {
    update.nickname_effect = "plain";
    update.nickname_gradient = false;
  }
  if (row.app_theme_id && !isFreeAppThemeId(row.app_theme_id)) {
    update.app_theme_id = null;
  }
  const slots: Array<[keyof EquippedRow, string]> = [
    ["profile_effect_id", "profile_effect_id"], ["profile_background_id", "profile_background_id"],
    ["profile_frame_id", "profile_frame_id"], ["avatar_ring_id", "avatar_ring_id"],
    ["avatar_decoration_id", "avatar_decoration_id"], ["feed_card_style_id", "feed_card_style_id"],
    ["animated_avatar_id", "animated_avatar_id"], ["app_theme_id", "app_theme_id"],
    ["nickname_color", "nickname_style"],
  ];
  for (const [field, slot] of slots) {
    const value = row[field];
    if (typeof value === "string" && gated.has(`${slot}:${value}`)) update[field] = null;
  }
  if (row.banner_value?.id && gated.has(`banner:${row.banner_value.id}`)) {
    update.banner_type = "color";
    update.banner_value = { color: "#1A0D2E" };
  } else if (row.banner_value?.key && !row.banner_value.id) {
    update.banner_type = "color";
    update.banner_value = { color: "#1A0D2E" };
  }
  if (update.nickname_color === null && row.nickname_gradient) update.nickname_gradient = false;
  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    const { error } = await admin.from("profile_customization").update(update).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
}

export function isSubscriptionActive(
  subscription: { expires_at: string } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!subscription?.expires_at) return false;
  return new Date(subscription.expires_at) > now;
}

export async function getSubscriptionRest(userId: string): Promise<SubscriptionRow | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("tier, started_at, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SubscriptionRow | null;
}

export async function getSubscriptionStatusRest(userId: string): Promise<SubscriptionStatusView> {
  const row = await getSubscriptionRest(userId);
  const active = isSubscriptionActive(row);
  return {
    active,
    tier: row?.tier ?? null,
    startedAt: active && row ? row.started_at : null,
    expiresAt: row?.expires_at ?? null,
  };
}

/** Продлевает или активирует Voople+ после успешной оплаты. */
export async function extendVooplePlusRest(
  userId: string,
  externalId: string,
  periodDays: number = VOOPLUS_PERIOD_DAYS,
  paymentProvider: string = "yookassa",
): Promise<SubscriptionStatusView> {
  const admin = getAdminClient();
  const { error } = await admin.rpc("extend_voople_plus_once", {
    p_user_id: userId,
    p_external_id: externalId,
    p_period_days: periodDays,
    p_provider: paymentProvider,
  });
  if (error) throw new Error(error.message);
  return getSubscriptionStatusRest(userId);
}

export async function hasActiveSubscriptionRest(userId: string): Promise<boolean> {
  const row = await getSubscriptionRest(userId);
  return isSubscriptionActive(row);
}

export async function assertActiveSubscriptionRest(userId: string): Promise<void> {
  const active = await hasActiveSubscriptionRest(userId);
  if (!active) {
    throw new Error("Свой баннер доступен с подпиской Voople+");
  }
}
