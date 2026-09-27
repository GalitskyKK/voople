"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Video, VideoOff, MonitorUp, MoreHorizontal } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import type { VoiceSessionDockProps } from "./voice-session-dock-types";

type Props = Omit<VoiceSessionDockProps, "mode" | "onModeChange" | "connectionQuality" | "mediaPreview"> & { inSidebar?: boolean };

export function VoiceCompactSessionDock({ chatName, participantCount, mediaStatus, connectionLabel,
  micMuted, outputMuted, cameraEnabled, screenSharing, mediaActionPending, leavePending,
  onOpen, onToggleMic, onToggleOutput, onToggleCamera, onToggleScreenShare, onLeave,
  cameraPending, screenSharePending, errorMessage, inSidebar = false,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (inSidebar || !root.current) return;
    const element = root.current;
    const update = () => document.documentElement.style.setProperty("--voople-compact-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--voople-compact-height"); };
  }, [inSidebar]);
  const [expanded, setExpanded] = useState(false);
  const connected = mediaStatus === "connected";
  const controlClass = "voople-voice-compact__control";
  return (
    <div ref={root} className={cn("voople-voice-dock--compact", inSidebar && "voople-voice-dock--sidebar")}
      role="region" aria-label="Компактный голосовой разговор">
      <button type="button" onClick={onOpen} className="voople-voice-compact__identity" aria-label={`Открыть разговор ${chatName}`}>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", connected ? "bg-[var(--material-ice)]" : "bg-[var(--material-presence)]")} />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">{chatName}</span>
          <span className="block truncate text-xs text-[var(--app-muted)]" role="status">
            {connected ? `${participantCount} в разговоре` : connectionLabel ?? "Подключаемся…"}
          </span>
        </span>
      </button>
      <div className="voople-voice-compact__controls">
        <IconButton label={micMuted ? "Включить микрофон" : "Выключить микрофон"} aria-pressed={!micMuted}
          disabled={mediaActionPending || !connected} onClick={onToggleMic} className={controlClass}>
          {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </IconButton>
        <IconButton label={outputMuted ? "Включить звук собеседников" : "Выключить звук собеседников"} aria-pressed={outputMuted}
          disabled={mediaActionPending} onClick={onToggleOutput} className={controlClass}>
          {outputMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </IconButton>
        {inSidebar ? null : <IconButton label="Камера и демонстрация экрана" aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)} className={controlClass}><MoreHorizontal className="h-4 w-4" /></IconButton>}
        <IconButton tooltipClassName="voople-voice-compact__leave-slot" label="Выйти из разговора" disabled={leavePending} onClick={onLeave}
          className={`${controlClass} voople-voice-compact__leave`}><PhoneOff className="h-4 w-4" /></IconButton>
      </div>
      {inSidebar || expanded ? <div className="voople-voice-compact__media">
        <IconButton label={cameraEnabled ? "Выключить камеру" : "Включить камеру"} aria-pressed={cameraEnabled}
          disabled={cameraPending || !connected} onClick={onToggleCamera} className={controlClass}>
          {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </IconButton>
        <IconButton label={screenSharing ? "Остановить показ экрана" : "Показать экран"} aria-pressed={screenSharing}
          disabled={screenSharePending || !connected} onClick={onToggleScreenShare} className={controlClass}>
          <MonitorUp className="h-4 w-4" />
        </IconButton>
      </div> : null}
      {errorMessage ? <p className="col-span-full px-2 pb-1 text-xs text-[var(--voople-danger)]" role="alert">{errorMessage}</p> : null}
    </div>
  );
}
