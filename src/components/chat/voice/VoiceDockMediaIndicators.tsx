import { Camera, Mic, MicOff, MonitorUp } from "lucide-react";

import {
  describeVoiceDockMediaState,
  type VoiceDockMediaState,
} from "@/lib/livekit/voice-dock-state";
import { cn } from "@/lib/utils";

export function VoiceDockMediaIndicators({
  micMuted,
  cameraEnabled,
  screenSharing,
  className,
}: VoiceDockMediaState & { className?: string }) {
  const labels = describeVoiceDockMediaState({ micMuted, cameraEnabled, screenSharing });

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", className)}
      role="status"
      aria-label={labels.join(", ")}
    >
      {micMuted ? <MicOff className="h-3.5 w-3.5 text-red-500" aria-hidden="true" /> : <Mic className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />}
      {cameraEnabled ? <Camera className="h-3.5 w-3.5 text-[var(--theme-accent)]" aria-hidden="true" /> : null}
      {screenSharing ? <MonitorUp className="h-3.5 w-3.5 text-[var(--theme-accent)]" aria-hidden="true" /> : null}
    </span>
  );
}
