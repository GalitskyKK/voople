"use client";

import Link from "next/link";
import { ArrowRight, Crown, Sparkles } from "lucide-react";

import { TEAM_PIN_IDS } from "@/lib/badges/registry";
import { trpc } from "@/lib/trpc/client";
import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";

export function SidebarHighlights() {
  const subscription = trpc.shop.subscriptionStatus.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const badges = trpc.engagement.myBadges.useQuery(undefined, { staleTime: 60_000 });
  const hasTeamPin = TEAM_PIN_IDS.some((id) => badges.data?.includes(id));

  return (
    <div className="shrink-0 space-y-2 px-3 pb-3">
      {!hasTeamPin && !badges.isLoading ? (
        <Link
          href="/events"
          className="group block rounded-[var(--app-radius-lg)] border border-[color-mix(in_srgb,var(--theme-accent)_24%,var(--app-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-accent)_14%,var(--app-surface)),var(--app-surface-soft))] p-3 transition hover:border-[color-mix(in_srgb,var(--theme-accent)_50%,var(--app-border))]"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
            <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-[var(--app-accent-soft)] text-(--theme-accent)">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[var(--app-surface)]" />
            </span>
            Событие
          </div>
          <p className="mt-2 text-sm font-medium leading-tight text-[var(--foreground)]">На чьей ты волне?</p>
          <p className="mt-1 text-[11px] leading-4 text-[var(--app-muted)]">5 ситуаций · уникальный пин</p>
          <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-(--theme-accent)">
            Участвовать <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ) : null}

      <Link
        href="/shop?tab=plus"
        className="group flex items-center gap-2.5 rounded-[var(--app-radius-lg)] border border-[color-mix(in_srgb,var(--voople-brand-400)_42%,var(--app-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--voople-brand-500)_14%,var(--app-surface)),var(--app-surface-soft))] p-2.5 transition hover:border-[color-mix(in_srgb,var(--voople-brand-300)_62%,var(--app-border))]"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--theme-accent)_16%,transparent)] text-(--theme-accent)">
          <Crown className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <VooplePlusBadge />
          <span className="block truncate text-[10px] text-[var(--app-muted)]">
            {subscription.data?.active ? "Подписка активна · управление" : "Темы, рамки и стиль имени"}
          </span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-(--theme-accent)" />
      </Link>
    </div>
  );
}
