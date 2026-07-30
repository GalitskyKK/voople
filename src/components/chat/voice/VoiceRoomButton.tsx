"use client";

import { Headphones, UsersRound } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  useVoiceSession,
  type VoiceSessionDescriptor,
} from "./VoiceSessionProvider";

export function VoiceRoomButton(props: VoiceSessionDescriptor) {
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

  return (
    <button
      type="button"
      onClick={() => openRoom(props)}
      disabled={Boolean(occupiedByAnotherRoom)}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        isCurrent && state.mediaStatus === "connected"
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-500"
          : active
            ? "border-[color-mix(in_srgb,var(--theme-accent)_40%,var(--app-border))] bg-[var(--app-accent-soft)] text-(--theme-accent)"
            : "border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
      )}
      aria-label={
        occupiedByAnotherRoom
          ? "Сначала завершите текущий разговор"
          : props.chatType === "direct"
            ? "Открыть голосовой разговор"
            : "Открыть голосовую комнату"
      }
      title={occupiedByAnotherRoom ? "Вы уже находитесь в другом разговоре" : undefined}
    >
      {active ? <UsersRound className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
      <span className="hidden sm:inline">
        {ringing && props.chatType === "direct"
          ? room.data?.isInside
            ? "Звоним…"
            : "Входящий звонок"
          : active
            ? `${participantCount} в комнате`
          : props.chatType === "direct"
            ? "Голос"
            : "Комната"}
      </span>
    </button>
  );
}
