"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { trpc } from "@/lib/trpc/client";
import { AccountChipVisual } from "./AccountChipVisual";

export function AppAccountChip({ compact = false }: { compact?: boolean }) {
  const viewer = trpc.user.viewer.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  if (viewer.isLoading) {
    return (
      <span
        className="grid h-10 place-items-center text-[var(--app-muted)]"
        role="status"
        aria-label="Загружаем профиль"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
    );
  }

  if (!viewer.data) return null;

  return (
    <Link href="/me" aria-label="Открыть свой профиль" className="block min-w-0">
      <AccountChipVisual
        displayName={viewer.data.displayName}
        username={viewer.data.username}
        compact={compact}
        avatar={
          <ProfileAvatar
            displayName={viewer.data.displayName}
            size="sm"
            animatedAvatarUrl={viewer.data.avatarUrl}
            decorationUrl={viewer.data.avatarDecorationUrl}
            ringId={viewer.data.avatarRingId}
          />
        }
      />
    </Link>
  );
}
