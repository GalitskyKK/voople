"use client";

import { createPortal } from "react-dom";
import { ExternalLink, MessageCircle, Pin, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { NavigationDestinationRenderer } from "@/components/layout/AppNavigationVisual";
import { MiniProfileCardView } from "@/components/profile/MiniProfileCardView";
import { useIsClient } from "@/hooks/useIsClient";
import { trpc } from "@/lib/trpc/client";
import type { PostAuthorView } from "@/types/domain";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";
import { ProfileBadgesView } from "@/components/profile/ProfileBadgesView";
import { reportProductEvent } from "@/lib/telemetry/client";
import { navigateInternally } from "@/lib/platform/internal-navigation";

export function MiniProfilePopover({ author, children, renderDestination }: { author: PostAuthorView; children: ReactNode; renderDestination: NavigationDestinationRenderer }) {
  const mounted = useIsClient();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const profile = trpc.profile.getByUsername.useQuery(
    { username: author.username },
    { enabled: open, staleTime: 30_000 },
  );
  const me = trpc.user.me.useQuery(undefined, { enabled: open, staleTime: 60_000, retry: false });
  const utils = trpc.useUtils();
  const canFollow = Boolean(me.data?.username && me.data.username !== author.username);
  const followState = trpc.profile.getFollowState.useQuery(
    { username: author.username },
    { enabled: open && canFollow, staleTime: 30_000 },
  );
  const toggleFollow = trpc.profile.toggleFollow.useMutation({
    onSuccess: () => void utils.profile.getFollowState.invalidate({ username: author.username }),
  });
  const pinnedContacts = trpc.social.myPinnedContacts.useQuery(undefined, {
    enabled: open && canFollow,
    staleTime: 30_000,
  });
  const togglePin = trpc.social.togglePinnedContact.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.social.myPinnedContacts.invalidate(),
        utils.home.overview.invalidate(),
      ]);
    },
  });
  const openDirect = trpc.chat.openDirect.useMutation({
    onSuccess: ({ chatId }) => {
      setOpen(false);
      if (!navigateInternally(`/messages/${chatId}`)) window.location.assign(`/messages/${chatId}`);
    },
  });
  const { onlineUserIds } = useOnlineUsers();

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = null;
    closeTimerRef.current = null;
  }, []);

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(336, window.innerWidth - 24);
    const height = popoverRef.current?.offsetHeight ?? 340;
    const leftAligned = rect.left;
    const rightAligned = rect.right - width;
    const left = leftAligned + width <= window.innerWidth - 12 ? leftAligned : rightAligned;
    const below = rect.bottom + 8;
    const above = rect.top - height - 8;
    setPosition({
      left: Math.max(12, Math.min(left, window.innerWidth - width - 12)),
      top: Math.max(12, below + height <= window.innerHeight - 12 ? below : above),
    });
  }, []);

  const show = useCallback(() => {
    clearTimers();
    updatePosition();
    setOpen(true);
  }, [clearTimers, updatePosition]);
  const scheduleShow = () => {
    if (open) return;
    clearTimers();
    openTimerRef.current = window.setTimeout(show, 520);
  };
  const scheduleClose = useCallback(() => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 180);
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, profile.data, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, updatePosition]);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (open) reportProductEvent("mini_profile_opened", { surface: "author" });
  }, [open]);

  const value = profile.data;
  const displayName = value?.displayName ?? author.displayName;
  const pinned = Boolean(value?.id && pinnedContacts.data?.pinnedUserIds.includes(value.id));
  const online = Boolean(value?.id && onlineUserIds.has(value.id));
  const badges = trpc.engagement.badges.useQuery(
    { userId: value?.id ?? author.id ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: open && Boolean(value?.id ?? author.id), staleTime: 60_000 },
  );

  return (
    <>
      <span ref={anchorRef} className="inline-flex min-w-0" onMouseEnter={scheduleShow} onMouseLeave={scheduleClose} onFocusCapture={show} onBlurCapture={scheduleClose} onPointerDown={clearTimers}>{children}</span>
      {open && mounted ? createPortal(
        <aside
          ref={popoverRef}
          className="fixed z-[95] w-[min(21rem,calc(100vw-1.5rem))] overflow-visible"
          style={{ left: position.left, top: Math.max(12, position.top) }}
          onMouseEnter={() => {
            if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
          }}
          onMouseLeave={scheduleClose}
          aria-label={`Мини-профиль ${displayName}`}
        >
          {value ? (
            <MiniProfileCardView
              profile={value}
              online={online}
              badges={<ProfileBadgesView badgeIds={badges.data ?? []} compact className="mt-0" />}
              actions={
                <>
                  {canFollow ? (
                    <button type="button" disabled={openDirect.isPending} onClick={() => openDirect.mutate({ username: author.username })} className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] px-3 text-xs font-medium hover:border-[var(--theme-accent)] disabled:opacity-55" aria-label={`Написать ${displayName}`}>
                      <MessageCircle className="h-3.5 w-3.5" />Написать
                    </button>
                  ) : null}
                  {renderDestination({ href: `/${author.username}`, label: `Открыть профиль ${displayName}`, active: false, className: "inline-flex h-8 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] px-3 text-xs font-medium hover:border-[var(--theme-accent)]", children: <><ExternalLink className="h-3.5 w-3.5" />Профиль</> })}
                  {canFollow && value.id ? (
                    <button type="button" disabled={togglePin.isPending} onClick={() => togglePin.mutate({ userId: value.id })} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--foreground)_14%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:border-[var(--theme-accent)] disabled:opacity-55" aria-label={pinned ? `Открепить ${displayName}` : `Закрепить ${displayName}`} aria-pressed={pinned}>
                      <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-current text-[var(--theme-accent)]" : ""}`} />
                    </button>
                  ) : null}
                  {canFollow ? (
                    <button type="button" disabled={followState.isLoading || toggleFollow.isPending} onClick={() => toggleFollow.mutate({ username: author.username })} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--theme-accent)] px-3 text-xs font-semibold text-white disabled:opacity-55" aria-pressed={followState.data?.following ?? false}>
                      {followState.data?.following ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}{followState.data?.following ? "Отписаться" : "Подписаться"}
                    </button>
                  ) : null}
                </>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-lg)]" aria-busy={!profile.error}>
              <p className="font-semibold">{displayName}</p>
              <p className="text-xs text-[var(--app-muted)]">@{author.username}</p>
              {profile.error ? <p className="mt-4 text-sm text-red-400" role="alert">Не удалось загрузить детали профиля</p> : <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />}
            </div>
          )}
          {togglePin.error ? <p className="mt-2 rounded-xl bg-[var(--app-surface)] p-2 text-xs text-red-400 shadow-lg" role="alert">{togglePin.error.message}</p> : null}
        </aside>,
        document.body,
      ) : null}
    </>
  );
}
