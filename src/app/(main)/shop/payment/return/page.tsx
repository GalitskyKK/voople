"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { trpc } from "@/lib/trpc/client";

export default function ShopPaymentReturnPage() {
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      utils.shop.subscriptionStatus.invalidate(),
      utils.shop.overview.invalidate(),
      utils.profile.invalidate(),
    ]).finally(() => {
      if (!cancelled) setSynced(true);
    });
    return () => {
      cancelled = true;
    };
  }, [utils]);

  const hint = searchParams.get("hint");

  return (
    <div className="voople-panel mx-auto max-w-md space-y-4 p-8 text-center">
      <h1 className="text-lg font-semibold text-[var(--foreground)]">Оплата</h1>
      {synced ? (
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">
          {hint === "pending"
            ? "Платёж обрабатывается. Подписка или товар появятся в аккаунте после подтверждения ЮKassa."
            : "Если оплата прошла успешно, подписка Voople+ или купленный предмет появятся в течение минуты."}
        </p>
      ) : (
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">Обновляем данные…</p>
      )}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link
          href="/shop?tab=plus"
          className="inline-flex h-10 items-center rounded-xl bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)]"
        >
          Магазин
        </Link>
        <Link
          href="/settings/profile"
          className="inline-flex h-10 items-center rounded-xl px-4 text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:text-[var(--foreground)]"
        >
          Профиль
        </Link>
      </div>
    </div>
  );
}
