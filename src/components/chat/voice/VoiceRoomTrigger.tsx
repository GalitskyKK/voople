"use client";

import { Headphones, UsersRound } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

import type { MediaStatus } from "./voice-room-config";

export function VoiceRoomTrigger({
  active,
  isDirect,
  mediaStatus,
  participantCount,
  onOpen,
}: {
  active: boolean;
  isDirect: boolean;
  mediaStatus: MediaStatus;
  participantCount: number;
  onOpen: () => void;
}) {
  const label = mediaStatus === "reconnecting"
    ? "Восстанавливаем связь"
    : active
      ? `${participantCount} в комнате`
      : isDirect
        ? "Голосовой разговор"
        : "Комната";

  return (
    <IconButton
      label={label}
      tooltipSide="bottom"
      onClick={onOpen}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-medium transition",
        mediaStatus === "connected"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
          : mediaStatus === "reconnecting"
            ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
            : active
              ? "border-[var(--theme-accent)]/35 bg-[var(--app-accent-soft)] text-(--theme-accent)"
              : "border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
      )}
    >
      {active ? <UsersRound className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
    </IconButton>
  );
}
