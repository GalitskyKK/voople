"use client";

import { Play, Volume2 } from "lucide-react";

import type { GroupSoundView } from "@/types/chat";

export function VoiceSoundboardPanel({ sounds, onPlay }: {
  sounds: GroupSoundView[];
  onPlay: (sound: GroupSoundView) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {sounds.map((sound) => (
        <button key={sound.id} type="button" onClick={() => onPlay(sound)} className="group flex min-w-0 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 text-left transition hover:border-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--app-surface)] text-[var(--theme-accent)]"><Play className="h-4 w-4 fill-current" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{sound.name}</span><span className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--app-muted)]"><Volume2 className="h-3 w-3" />{(sound.durationMs / 1000).toFixed(1)} с</span></span>
        </button>
      ))}
    </div>
  );
}
