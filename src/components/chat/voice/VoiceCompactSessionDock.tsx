"use client";

import { ChevronDown, ChevronUp, Mic, MicOff, PhoneOff, Users } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import { formatVoiceDockParticipantCount } from "@/lib/livekit/voice-dock-state";
import { cn } from "@/lib/utils";
import { VoiceDockMediaIndicators } from "./VoiceDockMediaIndicators";
import type { VoiceCollapsedDockProps } from "./voice-session-dock-types";

export function VoiceCompactSessionDock({
  chatName,
  participantCount,
  activeSpeakerName,
  durationLabel,
  mediaStatus,
  connectionLabel,
  micMuted,
  cameraEnabled,
  screenSharing,
  mediaActionPending,
  leavePending,
  onOpen,
  onToggleMic,
  onLeave,
  onModeChange,
}: VoiceCollapsedDockProps) {
  const connected = mediaStatus === "connected";
  const participantLabel = formatVoiceDockParticipantCount(participantCount);
  const activityLabel = connected
    ? activeSpeakerName
      ? `${activeSpeakerName} говорит`
      : durationLabel ?? "Голос подключён"
    : connectionLabel ?? "Подключаем…";

  return (
    <div
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-[70] flex h-[52px] w-[min(480px,calc(100vw-1rem))] -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] p-1.5 shadow-[var(--app-shadow-nav)] backdrop-blur-xl lg:bottom-4"
      role="region"
      aria-label="Компактный голосовой разговор"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 text-left transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--theme-accent)]"
      >
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{chatName}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-[var(--app-muted)]">
            <span className="inline-flex shrink-0 items-center gap-1" aria-label={participantLabel}>
              <Users className="h-3 w-3" aria-hidden="true" />
              {participantCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{activityLabel}</span>
            <VoiceDockMediaIndicators
              micMuted={micMuted}
              cameraEnabled={cameraEnabled}
              screenSharing={screenSharing}
            />
          </span>
        </span>
      </button>

      <IconButton
        label={micMuted ? "Включить микрофон" : "Выключить микрофон"}
        onClick={onToggleMic}
        disabled={mediaActionPending || !connected}
        className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", micMuted ? "bg-red-500/10 text-red-500" : "bg-[var(--theme-accent)] text-white")}
      >
        {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </IconButton>
      <IconButton label="Развернуть мини-комнату" onClick={() => onModeChange("mini")} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]">
        <ChevronUp className="h-4 w-4" />
      </IconButton>
      <IconButton label="Свернуть до индикатора" onClick={() => onModeChange("minimal")} className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] min-[390px]:grid">
        <ChevronDown className="h-4 w-4" />
      </IconButton>
      <IconButton label="Выйти из разговора" disabled={leavePending} onClick={onLeave} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500 text-white disabled:opacity-50">
        <PhoneOff className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
