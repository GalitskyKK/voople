"use client";

import { RotateCcw, Volume2, VolumeX } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { ChatRoomParticipantView } from "@/types/chat";

type VoiceParticipantContextMenuProps = {
  participant: ChatRoomParticipantView;
  open: boolean;
  anchorPoint: { x: number; y: number } | null;
  volume: number;
  onOpenChange: (open: boolean) => void;
  onVolumeChange: (volume: number) => void;
};

export function VoiceParticipantContextMenu({
  participant,
  open,
  anchorPoint,
  volume,
  onOpenChange,
  onVolumeChange,
}: VoiceParticipantContextMenuProps) {
  const volumePercent = Math.round(volume * 100);
  const muted = volumePercent === 0;
  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] focus-visible:bg-[var(--app-accent-soft)] focus-visible:outline-none";

  return (
    <DropdownMenu
      open={open}
      onOpenChange={onOpenChange}
      anchorPoint={anchorPoint}
      align="start"
      menuClassName="w-64 p-1"
    >
      <div className="border-b border-[var(--app-border)] px-2 py-2" role="none">
        <p className="truncate text-sm font-semibold">{participant.displayName}</p>
        <p className="truncate text-xs text-[var(--app-muted)]">@{participant.username}</p>
      </div>
      <label className="block px-2 py-2.5 text-xs text-[var(--app-muted)]" role="none">
        <span className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Громкость
          </span>
          <span className="tabular-nums text-[var(--foreground)]">{volumePercent}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={volumePercent}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          className="w-full accent-[var(--theme-accent)]"
          aria-label={`Громкость ${participant.displayName}: ${volumePercent}%`}
        />
      </label>
      <button
        type="button"
        role="menuitem"
        className={menuItemClass}
        onClick={() => {
          onVolumeChange(muted ? 1 : 0);
          onOpenChange(false);
        }}
      >
        {muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        {muted ? "Вернуть громкость" : "Заглушить"}
      </button>
      <button
        type="button"
        role="menuitem"
        className={menuItemClass}
        onClick={() => {
          onVolumeChange(1);
          onOpenChange(false);
        }}
      >
        <RotateCcw className="h-4 w-4" />
        Сбросить до 100%
      </button>
    </DropdownMenu>
  );
}
