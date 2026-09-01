"use client";
/* eslint-disable @next/next/no-img-element -- shared CDN avatars for Next.js and Tauri. */

import { ArrowRight, ChevronDown, ChevronUp, LoaderCircle, MessageCircle, Radio, UsersRound } from "lucide-react";
import { useEffect, useMemo } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { reportProductEvent } from "@/lib/telemetry/client";
import { resolveRingStyle } from "@/lib/customization/rings";
import { useLocalChatAttention } from "@/hooks/useLocalChatAttention";
import { useScrollCompaction } from "@/hooks/useScrollCompaction";
import { selectContinueWithLocalAttention } from "@/lib/social/home-ranking";
import { cn } from "@/lib/utils";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import type { HomeNowItem, HomeOverviewView, HomeRoomTarget } from "@/types/home";

import { HomeNowItemView } from "./HomeNowItem";

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
      <ProfileAvatarVisual
        displayName={item.title}
        size="sm"
        avatarImage={item.avatarUrl ? <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" /> : undefined}
        decorationImage={item.avatarDecorationUrl ? <img src={item.avatarDecorationUrl} alt="" className="h-full w-full object-contain" /> : undefined}
        ringClassName={resolveRingStyle(item.avatarRingId)?.className}
        isOnline={online}
      />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">{showPresence && online ? "Сейчас в сети" : item.subtitle}</span></span>
      {item.unreadCount ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--theme-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white" aria-label={`Непрочитанных: ${item.unreadCount}`}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</span> : null}
      <ArrowRight className="h-4 w-4 shrink-0 text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100" />
    </>,
  });
}

export function HomeNowPanelView({ overview, renderDestination, onMessageUser, onJoinRoom, messagingUsername, joiningRoomId, messageError, roomError, refreshing, refreshPaused, refreshError, onRetryRefresh }: {
  overview: HomeOverviewView;
  renderDestination: NavigationDestinationRenderer;
  onMessageUser?: (username: string) => void;
  onJoinRoom?: (target: HomeRoomTarget) => void;
  messagingUsername?: string | null;
  joiningRoomId?: string | null;
  messageError?: string | null;
  roomError?: string | null;
  refreshing?: boolean;
  refreshPaused?: boolean;
  refreshError?: string | null;
  onRetryRefresh?: () => void;
}) {
  const { onlineUserIds } = useOnlineUsers();
  const { surfaceRef, compact, toggleCompact } = useScrollCompaction();
  const items = useMemo(() => {
    const liveContacts = overview.continue.filter((item) => item.userId && onlineUserIds.has(item.userId));
    const unique = new Map<string, HomeNowItem>();
    for (const item of [...overview.now, ...liveContacts]) {
      const key = `${item.kind}-${item.id}`;
      if (!unique.has(key)) unique.set(key, item);
    }
    return [...unique.values()].slice(0, 5);
  }, [onlineUserIds, overview.continue, overview.now]);

  useEffect(() => {
    reportProductEvent("home_opened", { nowItems: items.length, continueItems: overview.continue.length });
    if (items.length > 0) reportProductEvent("presence_seen", { count: items.length });
  }, [items.length, overview.continue.length]);

  return (
    <section
      ref={surfaceRef}
      data-compact={compact ? "true" : "false"}
      className={cn(
        "voople-home-now voople-panel sticky top-[var(--voople-sticky-offset)] z-20 mb-4 border border-[var(--app-border)] px-3 transition-[padding,box-shadow] duration-200 motion-reduce:transition-none",
        compact ? "py-1.5 shadow-[var(--app-shadow-md)]" : "py-2.5",
      )}
      aria-labelledby="home-now-title"
    >
      <header className="flex items-center justify-between gap-3 px-1 pb-1">
        <h2 id="home-now-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">
          <Radio className="h-3.5 w-3.5" /> Сейчас
        </h2>
        <span className="flex items-center gap-1">
          {refreshPaused ? <span className="px-1 text-[10px] text-[var(--app-muted)]">Нет сети</span> : null}
          {refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--app-muted)] motion-reduce:animate-none" aria-label="Обновляем комнаты" /> : null}
          {!compact ? renderDestination({
            href: "/messages",
            label: "Все чаты",
            active: false,
            className: "text-xs font-medium text-[var(--app-muted)] hover:text-[var(--foreground)]",
            children: "Все чаты",
          }) : null}
          <button
            type="button"
            onClick={toggleCompact}
            aria-expanded={!compact}
            aria-label={compact ? "Развернуть блок Сейчас" : "Свернуть блок Сейчас"}
            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          >
            {compact ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </span>
      </header>
      {items.length ? (
        <div className="voople-scroll flex gap-1 overflow-x-auto">
          {items.map((item) => (
            <HomeNowItemView
              key={`${item.kind}-${item.id}`}
              item={item}
              renderDestination={renderDestination}
              onMessageUser={onMessageUser}
              onJoinRoom={onJoinRoom}
              messagePending={Boolean(messagingUsername)}
              roomPending={Boolean(joiningRoomId && item.roomTarget?.room.id === joiningRoomId)}
              compact={compact}
            />
          ))}
        </div>
      ) : renderDestination({
        href: "/messages",
        label: "Позвать своих",
        active: false,
        className: cn(
          "mt-1 flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--app-surface-soft)] px-3 text-left text-sm text-[var(--app-muted)] transition hover:text-[var(--foreground)]",
          compact ? "min-h-10" : "min-h-14",
        ),
        children: <><span>Сейчас тихо</span><span className="inline-flex items-center gap-1 font-medium text-[var(--theme-accent)]">Позвать своих <ArrowRight className="h-4 w-4 shrink-0" /></span></>,
      })}
      {messageError ? <p className="px-2 pb-1 pt-2 text-xs text-red-400" role="alert">{messageError}</p> : null}
      {roomError ? <p className="px-2 pb-1 pt-2 text-xs text-red-400" role="alert">{roomError}</p> : null}
      {refreshError ? (
        <p className="flex items-center gap-2 px-2 pb-1 pt-2 text-xs text-[var(--app-muted)]" role="alert">
          Не удалось обновить комнаты.
          {onRetryRefresh ? <button type="button" className="font-semibold text-[var(--theme-accent)] hover:underline" onClick={onRetryRefresh}>Повторить</button> : null}
        </p>
      ) : null}
    </section>
  );
}

export function HomeSecondaryRailView({ overview, renderDestination }: { overview: HomeOverviewView; renderDestination: NavigationDestinationRenderer }) {
  const localAttention = useLocalChatAttention(overview.viewer?.userId);
  const continueItems = useMemo(
    () => overview.viewer?.userId
      ? selectContinueWithLocalAttention(overview.continueCandidates, localAttention)
      : overview.continue,
    [localAttention, overview.continue, overview.continueCandidates, overview.viewer?.userId],
  );

  return <aside className="voople-home-secondary-rail min-w-0" aria-label="Дополнительно на главной"><div className="voople-panel voople-scroll sticky top-[var(--voople-sticky-offset)] max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain border border-[var(--app-border)] p-3">
    {overview.viewer ? <div className="mb-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_26%,var(--app-border))] bg-[linear-gradient(135deg,var(--app-accent-soft),transparent_72%)] p-1"><DestinationItem item={overview.viewer} renderDestination={renderDestination} compact showPresence /></div> : null}
    <header className="flex items-center justify-between gap-2 px-2 pb-1"><span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-[var(--theme-accent)]" /><h2 className="text-sm font-semibold">Продолжить</h2></span>{renderDestination({ href: "/messages", label: "Все чаты", active: false, className: "text-[11px] text-[var(--app-muted)] hover:text-[var(--foreground)]", children: "Все" })}</header>
    {continueItems.map((item) => <DestinationItem key={`continue-${item.id}`} item={item} renderDestination={renderDestination} compact />)}
    {overview.communities.length ? <><p className="mb-1 mt-3 flex items-center gap-2 border-t border-[var(--app-border)] px-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]"><UsersRound className="h-3.5 w-3.5 text-[var(--theme-accent)]" />Ваши сообщества</p>{overview.communities.map((item) => <DestinationItem key={`community-${item.id}`} item={item} renderDestination={renderDestination} compact />)}</> : null}
  </div></aside>;
}
