"use client";
/* eslint-disable @next/next/no-img-element -- shared CDN avatars for Next.js and Tauri. */

import { ArrowRight, MessageCircle, Radio, UsersRound } from "lucide-react";
import { useEffect, useMemo } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { reportProductEvent } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import type { HomeNowItem, HomeOverviewView } from "@/types/home";

function DestinationItem({ item, renderDestination, compact = false, showPresence = false }: {
  item: HomeNowItem;
  renderDestination: NavigationDestinationRenderer;
  compact?: boolean;
  showPresence?: boolean;
}) {
  const { onlineUserIds } = useOnlineUsers();
  const online = item.userId ? onlineUserIds.has(item.userId) || item.online : item.online;
  return renderDestination({
    href: item.href,
    label: item.title,
    active: false,
    className: cn("group flex min-w-0 items-center gap-3 rounded-xl border border-transparent text-left transition hover:border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]", compact ? "p-2" : "p-3"),
    children: <>
      <ProfileAvatarVisual displayName={item.title} size="sm" avatarImage={item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : undefined} isOnline={online} />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">{showPresence && online ? "Сейчас в сети" : item.subtitle}</span></span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100" />
    </>,
  });
}

function NowItem({ item, renderDestination }: { item: HomeNowItem; renderDestination: NavigationDestinationRenderer }) {
  const { onlineUserIds } = useOnlineUsers();
  const online = item.userId ? onlineUserIds.has(item.userId) || item.online : item.online;
  return renderDestination({
    href: item.href,
    label: `${item.title}: ${item.kind === "room" ? "зайти в комнату" : "написать"}`,
    active: false,
    className: "group flex min-w-[8.75rem] flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
    children: <>
      <ProfileAvatarVisual displayName={item.title} size="sm" avatarImage={item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : undefined} isOnline={online || item.kind === "room"} />
      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="block truncate text-[11px] text-[var(--app-muted)]">{item.kind === "room" ? item.subtitle : "В сети"}</span><span className="mt-0.5 block text-[10px] font-semibold text-[var(--theme-accent)] opacity-0 transition group-hover:opacity-100">{item.kind === "room" ? "Зайти" : "Написать"}</span></span>
    </>,
  });
}

export function HomeNowPanelView({ overview, renderDestination }: { overview: HomeOverviewView; renderDestination: NavigationDestinationRenderer }) {
  const { onlineUserIds } = useOnlineUsers();
  const items = useMemo(() => {
    const liveContacts = overview.continue.filter((item) => item.userId && onlineUserIds.has(item.userId));
    const unique = new Map<string, HomeNowItem>();
    for (const item of [...overview.now, ...liveContacts]) unique.set(`${item.kind}-${item.id}`, item);
    return [...unique.values()].slice(0, 5);
  }, [onlineUserIds, overview.continue, overview.now]);

  useEffect(() => reportProductEvent("home_view", { nowItems: items.length, continueItems: overview.continue.length }), [items.length, overview.continue.length]);

  return <section className="voople-panel mb-4 border border-[var(--app-border)] px-3 py-2.5" aria-labelledby="home-now-title">
    <header className="flex items-center justify-between gap-3 px-1 pb-1"><h2 id="home-now-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]"><Radio className="h-3.5 w-3.5" /> Сейчас</h2>{renderDestination({ href: "/messages", label: "Все чаты", active: false, className: "text-xs font-medium text-[var(--app-muted)] hover:text-[var(--foreground)]", children: "Все чаты" })}</header>
    {items.length ? <div className="voople-scroll flex gap-1 overflow-x-auto">{items.map((item) => <NowItem key={`${item.kind}-${item.id}`} item={item} renderDestination={renderDestination} />)}</div> : renderDestination({ href: "/messages", label: "Начать разговор", active: false, className: "mt-1 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-[var(--app-surface-soft)] px-3 text-left text-sm text-[var(--app-muted)] transition hover:text-[var(--foreground)]", children: <><span>Сейчас никто не в сети и нет активных комнат.</span><ArrowRight className="h-4 w-4 shrink-0" /></> })}
  </section>;
}

export function HomeSecondaryRailView({ overview, renderDestination }: { overview: HomeOverviewView; renderDestination: NavigationDestinationRenderer }) {
  return <aside className="hidden min-w-0 xl:block" aria-label="Дополнительно на главной"><div className="voople-panel sticky top-4 border border-[var(--app-border)] p-3">
    {overview.viewer ? <div className="mb-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_26%,var(--app-border))] bg-[linear-gradient(135deg,var(--app-accent-soft),transparent_72%)] p-1"><DestinationItem item={overview.viewer} renderDestination={renderDestination} compact showPresence /></div> : null}
    <header className="flex items-center justify-between gap-2 px-2 pb-1"><span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[var(--theme-accent)]" /><h2 className="text-sm font-semibold">Продолжить</h2></span>{renderDestination({ href: "/messages", label: "Все чаты", active: false, className: "text-[11px] text-[var(--app-muted)] hover:text-[var(--foreground)]", children: "Все" })}</header>
    {overview.continue.map((item) => <DestinationItem key={`continue-${item.id}`} item={item} renderDestination={renderDestination} compact />)}
    {overview.communities.length ? <><p className="mb-1 mt-3 flex items-center gap-2 border-t border-[var(--app-border)] px-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]"><UsersRound className="h-3.5 w-3.5 text-[var(--theme-accent)]" />Ваши сообщества</p>{overview.communities.map((item) => <DestinationItem key={`community-${item.id}`} item={item} renderDestination={renderDestination} compact />)}</> : null}
  </div></aside>;
}
