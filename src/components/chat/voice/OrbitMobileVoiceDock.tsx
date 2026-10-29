"use client";

import { useId, useState } from "react";
import { AudioLines, Mic, MicOff, WifiOff } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Sheet } from "@/components/ui/Sheet";
import { VoiceCompactSessionDock, type VoiceCompactSessionDockProps } from "./VoiceCompactSessionDock";
import { useFloatingVoiceTile } from "./useFloatingVoiceTile";

export function OrbitMobileVoiceDock(props: VoiceCompactSessionDockProps) {
  const [open, setOpen] = useState(false);
  const hintId = useId();
  const tile = useFloatingVoiceTile();
  const { speaker, micMuted, mediaStatus, activeSpeakerName, localSpeaking, chatName } = props;
  const speaking = Boolean(activeSpeakerName || localSpeaking);
  const status = mediaStatus === "connected" ? micMuted ? "Микрофон выключен" : "Микрофон включён" : props.connectionLabel ?? "Подключаемся";
  return <>
    <button {...tile} type="button" className="voople-orbit-voice-tile" data-speaking={speaking} data-muted={micMuted}
      aria-label={`Управление разговором ${chatName}. ${status}${activeSpeakerName ? `. Говорит ${activeSpeakerName}` : ""}`}
      aria-describedby={hintId}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <span key={speaker?.id ?? "voice"} className="voople-orbit-voice-tile__avatar" aria-hidden="true">
        {speaker ? <ProfileAvatar displayName={speaker.displayName} animatedAvatarUrl={speaker.avatarUrl} decorationUrl={speaker.avatarDecorationUrl} ringId={speaker.avatarRingId} size="sm" className="h-11 w-11" shape="round" /> : <AudioLines className="h-7 w-7" />}
      </span>
      <span className="voople-orbit-voice-tile__mic" aria-hidden="true">{mediaStatus !== "connected" ? <WifiOff className="h-3 w-3" /> : micMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}</span>
    </button>
    <span id={hintId} className="sr-only">{props.errorMessage ?? "Для перемещения используйте перетаскивание или Alt со стрелками."}</span>
    <Sheet open={open} onClose={() => setOpen(false)} placement="bottom" ariaLabel="Управление разговором" className="voople-mobile-voice-sheet">
      <VoiceCompactSessionDock {...props} surface="sheet" onOpen={() => { setOpen(false); props.onOpen(); }} />
    </Sheet>
  </>;
}
