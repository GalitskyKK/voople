"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, Radio, UsersRound } from "lucide-react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import type { HomeNowItem, HomeOverviewView } from "@/types/home";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { reportProductEvent } from "@/lib/telemetry/client";

function OverviewItem({
  item,
  compact = false,
  showPresence = false,
}: {
  item: HomeNowItem;
  compact?: boolean;
  showPresence?: boolean;
}) {
  const { onlineUserIds } = useOnlineUsers();
  const online = item.userId ? onlineUserIds.has(item.userId) : item.online;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-xl border border-transparent transition hover:border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]",
        compact ? "p-2" : "p-3",
      )}
    >
      <ProfileAvatarVisual
        displayName={item.title}
        size="sm"
        avatarImage={item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : undefined}
        isOnline={online}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">
          {showPresence && online ? "Сейчас в сети" : item.subtitle}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

function NowItem({ item }: { item: HomeNowItem }) {
  const { onlineUserIds } = useOnlineUsers();
  const online = item.userId ? onlineUserIds.has(item.userId) || item.online : item.online;
  const action = item.kind === "room" ? "Зайти" : "Написать";
  return (
    <Link
      href={item.href}
      className="group flex min-w-[8.75rem] flex-1 items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
    >
      <ProfileAvatarVisual
        displayName={item.title}
        size="sm"
        avatarImage={item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : undefined}
        isOnline={online || item.kind === "room"}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        <span className="block truncate text-[11px] text-[var(--app-muted)]">
          {item.kind === "room" ? item.subtitle : online ? "В сети" : item.subtitle}
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold text-[var(--theme-accent)] opacity-0 transition group-hover:opacity-100">{action}</span>
      </span>
    </Link>
  );
}

export function HomeNowPanel({ overview }: { overview: HomeOverviewView }) {
  useEffect(() => reportProductEvent("home_view", {
    nowItems: overview.now.length,
    continueItems: overview.continue.length,
  }), [overview.continue.length, overview.now.length]);
  const items = overview.now;
  return (
    <section className="voople-panel mb-4 border border-[var(--app-border)] px-3 py-2.5" aria-labelledby="home-now-title">
      <header className="flex items-center justify-between gap-3 px-1 pb-1">
        <h2 id="home-now-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]"><Radio className="h-3.5 w-3.5" /> Сейчас</h2>
        <Link href="/messages" className="text-xs font-medium text-[var(--app-muted)] hover:text-[var(--foreground)]">Все чаты</Link>
      </header>
      {items.length ? (
        <div className="voople-scroll flex gap-1 overflow-x-auto">
          {items.slice(0, 5).map((item) => <NowItem key={`${item.kind}-${item.id}`} item={item} />)}
        </div>
      ) : (
        <Link
          href="/messages"
          className="mt-1 flex min-h-14 items-center justify-between gap-3 rounded-xl bg-[var(--app-surface-soft)] px-3 text-sm text-[var(--app-muted)] transition hover:text-[var(--foreground)]"
        >
          <span>Пока тихо — начните разговор или создайте комнату.</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}
    </section>
  );
}

export function HomeSecondaryRail({ overview }: { overview: HomeOverviewView }) {
  return (
    <aside className="hidden min-w-0 xl:block" aria-label="Дополнительно на главной">
      <div className="voople-panel sticky top-4 border border-[var(--app-border)] p-3">
        {overview.viewer ? (
          <div className="mb-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_26%,var(--app-border))] bg-[linear-gradient(135deg,var(--app-accent-soft),transparent_72%)] p-1">
            <OverviewItem item={overview.viewer} compact showPresence />
          </div>
        ) : null}
        <header className="flex items-center justify-between gap-2 px-2 pb-1">
          <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[var(--theme-accent)]" /><h2 className="text-sm font-semibold">Продолжить</h2></span>
          <Link href="/messages" className="text-[11px] text-[var(--app-muted)] hover:text-[var(--foreground)]">Все</Link>
        </header>
        {overview.continue.map((item) => <OverviewItem key={`continue-${item.id}`} item={item} compact />)}
        {overview.communities.length ? (
          <>
            <p className="mb-1 mt-3 flex items-center gap-2 border-t border-[var(--app-border)] px-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]"><UsersRound className="h-3.5 w-3.5 text-[var(--theme-accent)]" />Ваши сообщества</p>
            {overview.communities.map((item) => <OverviewItem key={`community-${item.id}`} item={item} compact />)}
          </>
        ) : null}
      </div>
    </aside>
  );
}
