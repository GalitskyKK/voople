"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";

export function LandingAccountActions() {
  const me = trpc.user.viewer.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  if (me.isLoading) {
    return (
      <span className="grid h-10 w-10 place-items-center text-[var(--app-muted)]" aria-label="Проверяем вход">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  if (me.data) {
    return (
      <Link
        href="/me"
        className="flex items-center gap-2 rounded-xl p-1.5 pr-2.5 transition hover:bg-[var(--app-surface-soft)]"
        aria-label="Открыть свой профиль"
      >
        <ProfileAvatar
          displayName={me.data.displayName}
          size="sm"
          animatedAvatarUrl={me.data.avatarUrl}
          decorationUrl={me.data.avatarDecorationUrl}
          ringId={me.data.avatarRingId}
        />
        <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
          @{me.data.username}
        </span>
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-[var(--app-surface-soft)]"
      >
        Войти
      </Link>
      <Link
        href="/register"
        className="rounded-xl bg-[var(--theme-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--app-shadow-sm)] transition hover:brightness-110"
      >
        Создать профиль
      </Link>
    </>
  );
}
