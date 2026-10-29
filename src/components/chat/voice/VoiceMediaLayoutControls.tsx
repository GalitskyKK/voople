"use client";
import { LayoutGrid, Rows3 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { VOICE_ROOM_CONTROL_CLASS } from "./voice-control-style";

export function VoiceMediaLayoutControls({ layout, onChange }: { layout: "focus" | "grid"; onChange: (next: "focus" | "grid") => void }) {
  return <div className="voople-full-room__stage-toolbar" role="group" aria-label="Расположение видео">
    <IconButton label="Показывать выбранное видео крупно" aria-pressed={layout === "focus"} onClick={() => onChange("focus")} className={VOICE_ROOM_CONTROL_CLASS}><Rows3 aria-hidden="true" /></IconButton>
    <IconButton label={layout === "focus" ? "Выйти из фокуса" : "Показывать все видео сеткой"} aria-pressed={layout === "grid"} onClick={() => onChange("grid")} className={VOICE_ROOM_CONTROL_CLASS}><LayoutGrid aria-hidden="true" /></IconButton>
  </div>;
}
