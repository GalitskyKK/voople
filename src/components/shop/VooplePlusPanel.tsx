"use client";

import { useState } from "react";
import { Crown } from "lucide-react";

import {
  VOOPLUS_BENEFITS,
  VOOPLUS_IS_RECURRING,
  VOOPLUS_PERIOD_DAYS,
  VOOPLUS_PRICE_RUB,
} from "@/lib/constants/subscription";
import { Button } from "@/components/ui/Button";
import type { PromoPreviewView } from "@/types/promo";
import type { SubscriptionStatusView } from "@/types/subscription";

type VooplePlusPanelProps = {
  status: SubscriptionStatusView | undefined;
  statusLoading?: boolean;
  paymentPending?: boolean;
  paymentError?: string | null;
  promoPending?: boolean;
  promoMessage?: string | null;
  promoDiscount?: PromoPreviewView | null;
  onSubscribe: (promoCode?: string) => void;
  onApplyPromo: (code: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function VooplePlusPanel({
  status,
  statusLoading,
  paymentPending,
  paymentError,
  promoPending,
  promoMessage,
  promoDiscount,
  onSubscribe,
  onApplyPromo,
}: VooplePlusPanelProps) {
  const [promoInput, setPromoInput] = useState("");
  const active = status?.active === true;
  const displayPrice = promoDiscount?.finalAmountRub ?? VOOPLUS_PRICE_RUB;

  return (
    <section className="voople-panel overflow-hidden border-(--theme-accent)/30 bg-linear-to-br from-(--theme-accent)/15 via-white/5 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-(--theme-accent)">
            <Crown className="h-4 w-4" aria-hidden />
            Voople+
          </p>
          <h2 className="text-xl font-semibold text-white">Премиум оформление профиля</h2>
          <p className="max-w-lg text-sm text-white/55">
            {VOOPLUS_PERIOD_DAYS} дней за разовую оплату.
            {!VOOPLUS_IS_RECURRING && " Автопродление не подключено — продлить можно вручную."} Оплата через
            ЮKassa.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {displayPrice} ₽
            {promoDiscount && promoDiscount.finalAmountRub < VOOPLUS_PRICE_RUB && (
              <span className="ml-2 text-base font-normal text-white/35 line-through">
                {VOOPLUS_PRICE_RUB} ₽
              </span>
            )}
          </p>
          <p className="text-sm text-white/45">на {VOOPLUS_PERIOD_DAYS} дн.</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-white/70">
        {VOOPLUS_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span className="text-(--theme-accent)" aria-hidden>
              •
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-white/45">Промокод</span>
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="VOOPLE7"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white placeholder:text-white/25 focus:border-(--theme-accent) focus:outline-none"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={promoPending || !promoInput.trim()}
          onClick={() => onApplyPromo(promoInput.trim())}
        >
          {promoPending ? "…" : "Применить"}
        </Button>
      </div>

      {promoDiscount && (
        <p className="mt-2 text-sm text-emerald-300/90">{promoDiscount.message}</p>
      )}
      {promoMessage && <p className="mt-2 text-sm text-white/60">{promoMessage}</p>}

      {statusLoading ? (
        <p className="mt-4 text-sm text-white/45">Проверяем подписку…</p>
      ) : active && status?.expiresAt ? (
        <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Подписка активна до {formatDate(status.expiresAt)}.
          {status.startedAt ? (
            <span className="block text-emerald-200/70">С {formatDate(status.startedAt)}</span>
          ) : null}
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={paymentPending}
            onClick={() =>
              onSubscribe(promoDiscount ? promoDiscount.code : promoInput.trim() || undefined)
            }
          >
            {paymentPending ? "Переход к оплате…" : `Оплатить ${displayPrice} ₽`}
          </Button>
          <p className="text-xs text-white/40">
            Нажимая кнопку, вы соглашаетесь с{" "}
            <a href="/legal/offer" className="underline hover:text-white/60">
              офертой
            </a>
            .
          </p>
        </div>
      )}

      {active && (
        <p className="mt-3 text-xs text-white/40">
          Продление: снова нажмите «Оплатить» до или после окончания срока — дни добавятся к дате окончания.
        </p>
      )}

      {paymentError && <p className="mt-3 text-sm text-red-400">{paymentError}</p>}
    </section>
  );
}
