"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { DisplayNameWithPin } from "@/components/profile/DisplayNameWithPin";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileMessageButton } from "@/components/profile/ProfileMessageButton";
import { RichText } from "@/components/ui/RichText";
import { useIsClient } from "@/hooks/useIsClient";
import { trpc } from "@/lib/trpc/client";
import type { PostAuthorView } from "@/types/domain";

export function MiniProfilePopover({ author, children }: { author: PostAuthorView; children: ReactNode }) {
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

  const value = profile.data;
  const customization = value?.customization ?? author.customization;
  const avatarUrl = value?.customization.assets.animatedAvatarUrl ?? author.avatarUrl ?? customization?.assets.animatedAvatarUrl;
  const displayName = value?.displayName ?? author.displayName;
  const hasPlus = value?.hasVooplePlus ?? author.hasVooplePlus;

  return (
    <>
      <span ref={anchorRef} className="inline-flex min-w-0" onMouseEnter={scheduleShow} onMouseLeave={scheduleClose} onFocusCapture={show} onBlurCapture={scheduleClose} onPointerDown={clearTimers}>{children}</span>
      {open && mounted ? createPortal(
        <aside
          ref={popoverRef}
          className="fixed z-[95] w-[min(21rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-lg)]"
          style={{ left: position.left, top: Math.max(12, position.top), "--theme-accent": customization?.themeAccent } as React.CSSProperties}
          onMouseEnter={() => {
            if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
          }}
          onMouseLeave={scheduleClose}
          aria-label={`Мини-профиль ${displayName}`}
        >
          <div className="h-24 bg-[linear-gradient(135deg,var(--theme-accent),color-mix(in_srgb,var(--theme-accent)_30%,var(--app-surface)))] bg-cover bg-center" style={customization?.assets.bannerUrl ? { backgroundImage: `url("${customization.assets.bannerUrl}")` } : undefined} />
          <div className="px-4 pb-4">
            <div className="-mt-8 flex items-end justify-between gap-3">
              <ProfileAvatar displayName={displayName} size="lg" animatedAvatarUrl={avatarUrl} decorationUrl={customization?.assets.avatarDecorationUrl} ringId={customization?.avatarRingId} />
              <div className="mb-1 flex gap-2"><ProfileMessageButton username={author.username} size="sm" /><ProfileFollowButton username={author.username} canFollow={!me.isLoading && me.data?.username !== author.username} layout="compact" /></div>
            </div>
            <DisplayNameWithPin hasVooplePlus={hasPlus} className="mt-3 text-base font-semibold">{displayName}</DisplayNameWithPin>
            <p className="text-xs text-[var(--app-muted)]">@{author.username}</p>
            {value?.bio ? <p className="mt-3 line-clamp-3 text-sm leading-5 text-[var(--app-muted)]"><RichText text={value.bio} /></p> : null}
            {value ? <div className="mt-4 flex gap-4 border-t border-[var(--app-border)] pt-3 text-xs"><span><strong>{value.stats.followers}</strong> <span className="text-[var(--app-muted)]">подписчиков</span></span><span><strong>{value.stats.posts}</strong> <span className="text-[var(--app-muted)]">постов</span></span></div> : <div className="mt-4 h-8 animate-pulse rounded-xl bg-[var(--app-surface-soft)]" />}
          </div>
        </aside>,
        document.body,
      ) : null}
    </>
  );
}
