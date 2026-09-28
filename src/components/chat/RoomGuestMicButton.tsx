"use client";

import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function RoomGuestMicButton({ muted, disabled, onToggle }: {
  muted: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return <Button
    variant={muted ? "secondary" : "primary"}
    aria-pressed={!muted}
    aria-label={muted ? "Включить микрофон" : "Выключить микрофон"}
    disabled={disabled}
    onClick={onToggle}
  >
    {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    {muted ? "Включить микрофон" : "Выключить микрофон"}
  </Button>;
}
