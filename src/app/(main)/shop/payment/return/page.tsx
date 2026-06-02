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
    void utils.shop.subscriptionStatus.invalidate();
    void utils.shop.overview.invalidate();
    void utils.profile.invalidate();
    setSynced(true);
  }, [utils]);

  const hint = searchParams.get("hint");

  return (
    <div className="voople-panel mx-auto max-w-md space-y-4 p-8 text-center">
      <h1 className="text-lg font-semibold text-white">Оплата</h1>
      {synced ? (
        <p className="text-sm text-white/60">
          {hint === "pending"
            ? "Платёж обрабатывается. Подписка или товар появятся в аккаунте после подтверждения ЮKassa."
            : "Если оплата прошла успешно, подписка Voople+ или купленный предмет появятся в течение минуты."}
        </p>
      ) : (
        <p className="text-sm text-white/60">Обновляем данные…</p>
      )}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link
          href="/shop?tab=plus"
          className="inline-flex h-10 items-center rounded-xl bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15"
        >
          Магазин
        </Link>
        <Link
          href="/settings/profile"
          className="inline-flex h-10 items-center rounded-xl px-4 text-sm text-white/60 hover:text-white"
        >
          Профиль
        </Link>
      </div>
    </div>
  );
}
