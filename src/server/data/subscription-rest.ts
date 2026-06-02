import { getAdminClient } from "@/lib/supabase/admin";
import { VOOPLUS_PERIOD_DAYS, VOOPLUS_TIER } from "@/lib/constants/subscription";
import type { SubscriptionStatusView } from "@/types/subscription";

export type { SubscriptionStatusView };

type SubscriptionRow = {
  tier: string;
  started_at: string;
  expires_at: string;
};

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
  const now = new Date();
  const existing = await getSubscriptionRest(userId);

  const base =
    existing && isSubscriptionActive(existing, now)
      ? new Date(existing.expires_at)
      : now;
  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + periodDays);

  const startedAt =
    existing && isSubscriptionActive(existing, now) ? existing.started_at : now.toISOString();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      tier: VOOPLUS_TIER,
      started_at: startedAt,
      expires_at: expiresAt.toISOString(),
      payment_provider: paymentProvider,
      external_id: externalId,
    },
    { onConflict: "user_id" },
  );

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
