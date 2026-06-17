"use client";

import Link from "next/link";
import { Crown } from "lucide-react";

import {
  VOOPLUS_BENEFITS,
  VOOPLUS_IS_RECURRING,
  VOOPLUS_PERIOD_DAYS,
  VOOPLUS_PRICE_RUB,
} from "@/lib/constants/subscription";
import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type VooplePlusInfoModalProps = {
  open: boolean;
  onClose: () => void;
  /** Дата окончания, если известна (профиль с активной подпиской). */
  expiresAt?: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function VooplePlusInfoModal({ open, onClose, expiresAt }: VooplePlusInfoModalProps) {
  return (
    <Sheet open={open} onClose={onClose} placement="center">
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- mascot */}
          <img
            src={vooplusBadgeUrl()}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            decoding="async"
          />
        </div>

        <p className="inline-flex items-center gap-2 text-sm font-medium text-(--theme-accent)">
          <Crown className="h-4 w-4" aria-hidden />
          Voople+
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Премиум оформление</h2>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
          Подписка на {VOOPLUS_PERIOD_DAYS} дней за разовую оплату{" "}
          {VOOPLUS_PRICE_RUB} ₽.
          {!VOOPLUS_IS_RECURRING && " Автопродление не подключено."}
        </p>

        {expiresAt ? (
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Активна до {formatDate(expiresAt)}
          </p>
        ) : (
          <p className="mt-3 text-sm text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">У пользователя активна подписка Voople+.</p>
        )}

        <ul className="mt-4 w-full space-y-2 text-left text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
          {VOOPLUS_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span className="text-(--theme-accent)" aria-hidden>
                •
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Закрыть
          </Button>
          <Link href="/shop?tab=plus" className="flex-1" onClick={onClose}>
            <Button type="button" className="w-full">
              {expiresAt ? "Продлить" : "Оформить Voople+"}
            </Button>
          </Link>
        </div>
      </div>
    </Sheet>
  );
}
