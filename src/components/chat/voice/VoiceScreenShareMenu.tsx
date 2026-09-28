"use client";

import { Volume2, VolumeX, EyeOff } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";

type VoiceScreenShareMenuProps = {
  owner: string;
  open: boolean;
  anchorPoint: { x: number; y: number } | null;
  volume: number;
  onOpenChange: (open: boolean) => void;
  onVolumeChange: (volume: number) => void;
  onStopWatching: () => void;
};

export function VoiceScreenShareMenu({
  owner,
  open,
  anchorPoint,
  volume,
  onOpenChange,
  onVolumeChange,
  onStopWatching,
}: VoiceScreenShareMenuProps) {
  const percent = Math.round(volume * 100);
  return (
    <DropdownMenu
      open={open}
      onOpenChange={onOpenChange}
      anchorPoint={anchorPoint}
      align="start"
      contentRole="dialog"
      ariaLabel={`Звук демонстрации ${owner}`}
      menuClassName="w-64 p-1"
    >
      <div className="border-b border-[var(--app-border)] px-2 py-2">
        <p className="truncate text-sm font-semibold">Демонстрация · {owner}</p>
      </div>
      <label className="block px-2 py-2.5 text-xs text-[var(--app-muted)]">
        <span className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            {percent === 0 ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
            Громкость
          </span>
          <span className="tabular-nums text-[var(--foreground)]">{percent}%</span>
        </span>
        <input
          data-dropdown-autofocus=""
          type="range"
          min={0}
          max={200}
          step={5}
          value={percent}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          className="w-full accent-[var(--theme-accent)]"
          aria-label={`Громкость демонстрации ${owner}`}
        />
      </label>
      <button
        type="button"
        className="flex min-h-9 w-full items-center gap-2 rounded-[var(--app-radius-sm)] px-2 text-left text-xs text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
        onClick={() => {
          onOpenChange(false);
          onStopWatching();
        }}
      >
        <EyeOff className="h-4 w-4" aria-hidden="true" />
        Не смотреть
      </button>
    </DropdownMenu>
  );
}
