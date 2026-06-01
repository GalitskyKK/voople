"use client";

import { Coins, Heart, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WalletView } from "@/types/shop";

type ShopWalletBarProps = {
  wallet: WalletView;
  className?: string;
};

export function ShopWalletBar({ wallet, className }: ShopWalletBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
        className,
      )}
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-white/45">Баланс</p>
        <p className="flex items-center gap-2 text-lg font-semibold text-white">
          <Coins className="h-5 w-5 text-amber-300" aria-hidden />
          {wallet.balanceCoins.toLocaleString("ru-RU")}
          <span className="text-sm font-normal text-white/50">voops</span>
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/45">
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
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/40 to-black/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Heart className="h-4 w-4 text-pink-300" aria-hidden />
        <h2 className="text-sm font-semibold text-white">Поддержать Voople</h2>
      </div>
      <p className="mb-4 text-sm text-white/55">
        Донат через YooKassa скоро. Intent уже сохраняется — подключим оплату без переделки UI.
      </p>
      <div className="flex flex-wrap gap-2">
        {DONATION_PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={pending}
            onClick={() => onDonate(amount)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {amount} ₽
          </button>
        ))}
      </div>
      {message && <p className="mt-3 text-xs text-white/45">{message}</p>}
    </section>
  );
}
