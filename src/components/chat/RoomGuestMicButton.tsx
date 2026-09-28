"use client";

import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function RoomGuestMicButton({ muted, speaking, disabled, onToggle }: {
  muted: boolean;
  speaking: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return <Button
    variant={muted ? "secondary" : "primary"}
    aria-pressed={!muted}
    aria-label={muted ? "Включить микрофон" : speaking ? "Микрофон активен — вы говорите. Выключить микрофон" : "Выключить микрофон"}
    className={speaking ? "voople-mic-speaking" : undefined}
    disabled={disabled}
    onClick={onToggle}
  >
    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    {muted ? "Включить микрофон" : "Выключить микрофон"}
  </Button>;
}
