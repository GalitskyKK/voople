"use client";

import { Coins, Heart, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WalletView } from "@/types/shop";

type ShopWalletBarProps = {
  wallet: WalletView;
  className?: string;
  compact?: boolean;
};

export function ShopWalletBar({ wallet, className, compact = false }: ShopWalletBarProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 text-sm font-semibold",
          className,
        )}
        title="Баланс voops"
      >
        <Coins className="h-4 w-4 text-amber-300" aria-hidden />
        {wallet.balanceCoins.toLocaleString("ru-RU")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "voople-panel flex items-center justify-between px-4 py-3",
        className,
      )}
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">Баланс</p>
        <p className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Coins className="h-5 w-5 text-amber-300" aria-hidden />
          {wallet.balanceCoins.toLocaleString("ru-RU")}
          <span className="text-sm font-normal text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">voops</span>
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">
        <Sparkles className="h-4 w-4" aria-hidden />
        Внутренняя валюта Voople
      </div>
    </div>
  );
}

type DonationPanelProps = {
  onDonate: (amountRub: number) => void;
  pending?: boolean;
  message?: string | null;
};

const DONATION_PRESETS = [100, 300, 500] as const;

export function DonationPanel({ onDonate, pending, message }: DonationPanelProps) {
  return (
    <section className="voople-panel border border-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-accent)_12%,var(--app-surface)),var(--app-surface))] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Heart className="h-4 w-4 text-pink-300" aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Поддержать Voople</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {DONATION_PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={pending}
            onClick={() => onDonate(amount)}
            className="rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-2 text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--app-border-strong)] hover:bg-[color-mix(in_srgb,var(--app-surface-soft)_75%,white)] disabled:opacity-50"
          >
            {amount} ₽
          </button>
        ))}
      </div>
      {message && <p className="mt-3 text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">{message}</p>}
    </section>
  );
}
