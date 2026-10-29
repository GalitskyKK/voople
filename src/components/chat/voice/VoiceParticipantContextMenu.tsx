"use client";

import { RotateCcw, Volume2, VolumeX } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { ChatRoomParticipantView } from "@/types/chat";

type VoiceParticipantContextMenuProps = {
  participant: Pick<ChatRoomParticipantView, "displayName" | "username" | "guest">;
  open: boolean;
  anchorPoint: { x: number; y: number } | null;
  anchorRect?: { left: number; top: number; right: number; bottom: number };
  volume: number;
  onOpenChange: (open: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  onOpenProfile?: () => void;
  onVoop?: () => void;
  voopPending?: boolean;
  focusOwnerId?: string;
  presentation?: "menu" | "satellites";
};

export function VoiceParticipantContextMenu({
  participant,
  open,
  anchorPoint,
  anchorRect,
  volume,
  onOpenChange,
  onVolumeChange,
  onOpenProfile, onVoop, voopPending, focusOwnerId, presentation = "menu",
}: VoiceParticipantContextMenuProps) {
  const satellites = presentation === "satellites";
  const volumePercent = Math.round(volume * 100);
  const muted = volumePercent === 0;
  const menuItemClass =
    satellites ? "voople-orbit-room-menu__item" : "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] focus-visible:bg-[var(--app-accent-soft)] focus-visible:outline-none";

  return (
    <DropdownMenu
      open={open}
      onOpenChange={onOpenChange}
      anchorPoint={anchorPoint}
      contextAnchor={satellites && anchorRect ? { kind: "rect", ...anchorRect } : null}
      align="start"
      side={satellites ? "right" : "bottom"}
      ariaLabel={`Действия участника ${participant.displayName}`}
      minWidth={satellites ? 192 : 200}
      menuClassName={satellites ? "voople-orbit-room-menu voople-orbit-call-menu" : "w-64 p-1"}
      focusOwnerId={focusOwnerId}
    >
      {!satellites ? <div className="border-b border-[var(--app-border)] px-2 py-2" role="none">
        <p className="truncate text-sm font-semibold">{participant.displayName}</p>
        <p className="truncate text-xs text-[var(--app-muted)]">
          {participant.guest ? "Гость этой комнаты" : `@${participant.username}`}
        </p>
      </div> : null}
      {onOpenProfile ? <button type="button" role="menuitem" className={menuItemClass} onClick={() => { onOpenChange(false); onOpenProfile(); }}>Открыть профиль</button> : null}
      {onVoop ? <button type="button" role="menuitem" disabled={voopPending} className={menuItemClass} onClick={() => { onOpenChange(false); onVoop(); }}>Вуп · отдельный разговор</button> : null}
      {onVolumeChange ? <>
      <label className={satellites ? "voople-orbit-call-menu__volume" : "block px-2 py-2.5 text-xs text-[var(--app-muted)]"} role="none">
        <span className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Громкость
          </span>
          <span className="tabular-nums text-[var(--foreground)]">{volumePercent}%</span>
        </span>
        <input
          data-dropdown-autofocus
          onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") event.stopPropagation(); }}
          type="range"
          min={0}
          max={200}
          step={5}
          value={volumePercent}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          className="w-full min-h-11 accent-[var(--material-ice)]"
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
      </> : null}
    </DropdownMenu>
  );
}
