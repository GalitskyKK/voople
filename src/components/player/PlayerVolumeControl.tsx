"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player.store";

type PlayerVolumeControlProps = {
  className?: string;
  compact?: boolean;
  /** inline — слайдер рядом; popover — только иконка, слайдер всплывает вверх */
  mode?: "inline" | "popover";
};

export function PlayerVolumeControl({
  className,
  compact = false,
  mode = "inline",
}: PlayerVolumeControlProps) {
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const muted = volume === 0;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (mode !== "popover" || !open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mode, open]);

  const iconSize = compact ? "h-4 w-4" : "h-5 w-5";

  const toggleMute = () => setVolume(muted ? 0.8 : 0);

  if (mode === "popover") {
    return (
      <div ref={rootRef} className={cn("relative shrink-0", className)}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full p-1 text-[var(--app-muted)] hover:text-[var(--foreground)]"
          aria-label="Громкость"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
        >
          {muted ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
        </button>
        {open && (
          <div
            id={panelId}
            className="absolute bottom-full right-0 z-10 mb-2 flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 shadow-[var(--app-shadow-nav)]"
          >
            <button
              type="button"
              onClick={toggleMute}
              className="text-[var(--app-muted)] hover:text-[var(--foreground)]"
              aria-label={muted ? "Включить звук" : "Выключить звук"}
            >
              {muted ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-[var(--app-border)] accent-[var(--theme-accent)]"
              aria-label="Громкость"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={toggleMute}
        className="shrink-0 text-[var(--app-muted)] hover:text-[var(--foreground)]"
        aria-label={muted ? "Включить звук" : "Выключить звук"}
      >
        {muted ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className={cn(
          "h-1 cursor-pointer appearance-none rounded-full bg-[var(--app-border)] accent-[var(--theme-accent)]",
          compact ? "w-14" : "w-20",
        )}
        aria-label="Громкость"
      />
    </div>
  );
}
