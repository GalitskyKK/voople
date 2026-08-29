"use client";

import { Users } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import {
  describeVoiceDockMediaState,
  formatVoiceDockParticipantCount,
} from "@/lib/livekit/voice-dock-state";
import { cn } from "@/lib/utils";
import { VoiceDockMediaIndicators } from "./VoiceDockMediaIndicators";
import type { VoiceCollapsedDockProps } from "./voice-session-dock-types";

export function VoiceMinimalSessionDock({
  chatName,
  participantCount,
  activeSpeakerName,
  durationLabel,
  mediaStatus,
  micMuted,
  cameraEnabled,
  screenSharing,
  onModeChange,
}: VoiceCollapsedDockProps) {
  const participantLabel = formatVoiceDockParticipantCount(participantCount);
  const mediaLabels = describeVoiceDockMediaState({ micMuted, cameraEnabled, screenSharing });
  const activityLabel = activeSpeakerName
    ? `${activeSpeakerName} говорит`
    : durationLabel;

  return (
    <IconButton
      label={`Развернуть разговор ${chatName}. ${participantLabel}${activityLabel ? `. ${activityLabel}` : ""}. ${mediaLabels.join(", ")}`}
      onClick={() => onModeChange("compact")}
      className={cn(
        "fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-3 z-[70] flex h-12 max-w-[min(15rem,calc(100vw-1.5rem))] items-center gap-2 rounded-full border bg-[var(--app-surface)] px-3 shadow-[var(--app-shadow-nav)] transition hover:-translate-y-0.5 lg:bottom-4",
        mediaStatus === "connected" ? "border-emerald-500/40" : "border-amber-500/40",
      )}
    >
      <span className="min-w-0 truncate text-xs font-semibold">{chatName}</span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[var(--app-muted)]" aria-hidden="true">
        <Users className="h-3.5 w-3.5" />
        {participantCount}
      </span>
      <VoiceDockMediaIndicators
        micMuted={micMuted}
        cameraEnabled={cameraEnabled}
        screenSharing={screenSharing}
        className="pointer-events-none"
      />
      <span className={cn("absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-[var(--app-surface)]", mediaStatus === "connected" ? "bg-emerald-500" : "bg-amber-500")} />
    </IconButton>
  );
}
