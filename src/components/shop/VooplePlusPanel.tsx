"use client";

import { useState } from "react";
import { ArrowDown, Crown, ShieldCheck, Sparkles } from "lucide-react";

import {
  DEFAULT_VOOPLUS_PLAN_ID,
  VOOPLUS_IS_RECURRING,
  VOOPLUS_PLANS,
  getVooplePlusPlan,
  type VooplePlusPlanId,
} from "@/lib/constants/subscription";
import { Button } from "@/components/ui/Button";
import { parseDatabaseDate } from "@/lib/format/database-date";
import type { PromoPreviewView } from "@/types/promo";
import type { SubscriptionStatusView } from "@/types/subscription";
import { VooplePlusBenefits } from "@/components/subscription/VooplePlusBenefits";
import { VooplePlusShowcase } from "@/components/subscription/VooplePlusShowcase";
import { VooplePlusGroupLevels } from "@/components/subscription/VooplePlusGroupLevels";

type VooplePlusPanelProps = {
  status: SubscriptionStatusView | undefined;
  statusLoading?: boolean;
  paymentPending?: boolean;
  paymentError?: string | null;
  promoPending?: boolean;
  promoMessage?: string | null;
  promoDiscount?: PromoPreviewView | null;
  onSubscribe: (plan: VooplePlusPlanId, promoCode?: string) => void;
  onApplyPromo: (code: string, plan: VooplePlusPlanId) => void;
  legalOfferHref?: string;
  onOpenLegalOffer?: (href: string) => void;
};

function formatDate(iso: string) {
  return parseDatabaseDate(iso).toLocaleDateString("ru-RU", {
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
  legalOfferHref = "/legal/offer",
  onOpenLegalOffer,
}: VooplePlusPanelProps) {
  const [promoInput, setPromoInput] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<VooplePlusPlanId>(DEFAULT_VOOPLUS_PLAN_ID);
  const active = status?.active === true;
  const selectedPlan = getVooplePlusPlan(selectedPlanId);
  const activeDiscount = promoDiscount?.subscriptionPlan === selectedPlanId ? promoDiscount : null;
  const displayPrice = activeDiscount?.finalAmountRub ?? selectedPlan.priceRub;

  return (
    <section className="voople-plus-offer">
      <div className="voople-plus-offer__hero">
        <div className="voople-plus-offer__copy">
          <p className="voople-plus-offer__eyebrow"><Crown className="h-4 w-4" aria-hidden /> Вупл+</p>
          <h2>Твой Вупл.<br /><span>До последней детали.</span></h2>
          <p>
            Собери узнаваемый образ, настрой пространство под себя и поддержи группу,
            в которой проводишь время. Один набор возможностей — в web и desktop.
          </p>
          <a className="voople-plus-offer__jump" href="#voople-plus-plans">
            Выбрать тариф <ArrowDown className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <div className="voople-plus-offer__price">
          <Sparkles className="h-5 w-5" aria-hidden />
          <span>от</span>
          <strong>{VOOPLUS_PLANS[0].priceRub} ₽</strong>
          <span>в месяц</span>
        </div>
      </div>

      <VooplePlusShowcase />

      <VooplePlusGroupLevels />

      <div className="voople-plus-offer__included">
        <p>Возможности Вупл+</p>
        <h2>Не набор галочек.<br />Твой способ быть заметнее.</h2>
        <VooplePlusBenefits />
      </div>

      <section id="voople-plus-plans" className="voople-plus-checkout" aria-labelledby="voople-plus-plans-title">
        <div className="voople-plus-checkout__heading">
          <div>
            <p>Подписка</p>
            <h2 id="voople-plus-plans-title">Выбери свой Вупл+</h2>
          </div>
          <span><ShieldCheck className="h-4 w-4" aria-hidden /> Оплата через ЮKassa</span>
        </div>

        <div className="voople-plus-plans" role="radiogroup" aria-label="Срок подписки">
          {VOOPLUS_PLANS.map((plan) => {
            const selected = plan.id === selectedPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`voople-plus-plan ${selected ? "voople-plus-plan--active" : ""}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-[var(--foreground)]">
                    {plan.label}
                    {plan.id === "annual" ? <span className="voople-plus-badge">2 месяца в подарок</span> : null}
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">{plan.priceRub.toLocaleString("ru-RU")} ₽</span>
                </span>
                <span className="mt-1 block text-xs text-[var(--app-muted)]">
                  {plan.id === "annual" ? `${Math.round(plan.priceRub / 12)} ₽ в месяц` : plan.note}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">Промокод</span>
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="VOOPLE7"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/20 px-3 text-sm text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--foreground)_25%,transparent)] focus:border-(--theme-accent) focus:outline-none"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={promoPending || !promoInput.trim()}
          onClick={() => onApplyPromo(promoInput.trim(), selectedPlanId)}
        >
          {promoPending ? "…" : "Применить"}
        </Button>
      </div>

      {activeDiscount && (
        <p className="mt-2 text-sm text-emerald-300/90">{activeDiscount.message}</p>
      )}
      {promoMessage && <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">{promoMessage}</p>}

      {statusLoading ? (
        <p className="mt-4 text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">Проверяем подписку…</p>
      ) : active && status?.expiresAt ? (
        <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Подписка активна до {formatDate(status.expiresAt)}.
          {status.startedAt ? (
            <span className="block text-emerald-200/70">С {formatDate(status.startedAt)}</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={paymentPending}
          onClick={() =>
            onSubscribe(selectedPlanId, activeDiscount ? activeDiscount.code : promoInput.trim() || undefined)
          }
        >
          {paymentPending ? "Переход к оплате…" : active ? `Продлить за ${displayPrice} ₽` : `Оплатить ${displayPrice} ₽`}
        </Button>
        <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
          Нажимая кнопку, вы соглашаетесь с{" "}
          <a
            href={legalOfferHref}
            onClick={onOpenLegalOffer ? (event) => {
              event.preventDefault();
              onOpenLegalOffer(legalOfferHref);
            } : undefined}
            className="underline hover:text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]"
          >
            офертой
          </a>
          .
        </p>
        </div>

      {active && (
        <p className="mt-3 text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
          При продлении выбранный срок добавится к текущей дате окончания.
        </p>
      )}

        {!VOOPLUS_IS_RECURRING ? (
          <p className="mt-3 text-xs text-[var(--app-muted)]">Автопродление не подключается. Продлить подписку можно вручную.</p>
        ) : null}
        {paymentError && <p className="mt-3 text-sm text-red-400">{paymentError}</p>}
      </section>

      <VooplePlusFaq />
    </section>
  );
}

function VooplePlusFaq() {
  const items = [
    ["Когда начнут работать возможности?", "Сразу после подтверждения оплаты. Статус обновится в профиле и на всех ваших устройствах."],
    ["Можно ли перенести буст?", "Да. В подписке три слота. Каждый назначенный слот можно перенести в другую группу раз в 7 дней."],
    ["Что будет после окончания подписки?", "Оформление вернётся к базовому виду. Полученные предметы останутся в коллекции и снова откроются после продления."],
  ] as const;
  return (
    <section className="voople-plus-faq" aria-labelledby="voople-plus-faq-title">
      <p>Коротко о важном</p>
      <h2 id="voople-plus-faq-title">Вопросы о Вупл+</h2>
      <div>
        {items.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
