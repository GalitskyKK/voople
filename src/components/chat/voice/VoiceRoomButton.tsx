"use client";

import { Headphones, UsersRound } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  useVoiceSession,
  type VoiceSessionDescriptor,
} from "./VoiceSessionProvider";

export function VoiceRoomButton({ display = "icon", ...props }: VoiceSessionDescriptor & { display?: "icon" | "label" }) {
  const { activeSession, state, openRoom } = useVoiceSession();
  const room = trpc.chat.room.useQuery(
    { chatId: props.chatId },
    { staleTime: 5_000, refetchInterval: 15_000 },
  );
  const isCurrent = activeSession?.chatId === props.chatId;
  const occupiedByAnotherRoom = state.inside && activeSession && !isCurrent;
  const ringing = room.data?.status === "ringing";
  const active = room.data?.status === "active" || ringing;
  const participantCount = room.data?.participants.length ?? 0;
  const stateLabel = ringing && props.chatType === "direct"
    ? room.data?.isInside
      ? "Звоним…"
      : "Входящий звонок"
    : active
      ? `${participantCount} в комнате`
      : props.chatType === "direct"
        ? "Голосовой разговор"
        : "Комната";
  const actionLabel = occupiedByAnotherRoom
    ? "Сначала завершите текущий разговор"
    : stateLabel;

  return (
    <IconButton
      label={actionLabel}
      tooltipSide="bottom"
      onClick={() => openRoom(props)}
      disabled={Boolean(occupiedByAnotherRoom)}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        display === "icon" ? "w-9" : "gap-2 px-3",
        isCurrent && state.mediaStatus === "connected"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-500"
          : active
            ? "border-[color-mix(in_srgb,var(--theme-accent)_40%,var(--app-border))] bg-[var(--app-accent-soft)] text-(--theme-accent)"
            : "border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
      )}
    >
      {active ? <UsersRound className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
      {display === "label" ? <span>{stateLabel}</span> : null}
    </IconButton>
  );
}
