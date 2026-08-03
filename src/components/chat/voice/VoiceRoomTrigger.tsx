"use client";

import { Headphones, UsersRound } from "lucide-react";

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
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition",
        mediaStatus === "connected"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
          : mediaStatus === "reconnecting"
            ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
            : active
              ? "border-[var(--theme-accent)]/35 bg-[var(--app-accent-soft)] text-(--theme-accent)"
              : "border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
      )}
      aria-label={isDirect ? "Открыть голосовую комнату" : "Комната группы"}
    >
      {active ? <UsersRound className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
      <span className="hidden sm:inline">
        {mediaStatus === "reconnecting"
          ? "Связь…"
          : active
            ? `${participantCount} в комнате`
            : isDirect
              ? "Голос"
              : "Комната"}
      </span>
    </button>
  );
}
