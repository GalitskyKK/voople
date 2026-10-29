"use client";

import { GripVertical, Hash, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import type { useRoomChatPanelWidth } from "./useRoomChatPanelWidth";

export function RoomMessagesPanelFrame({ audienceLabel, resize, onClose, children }: {
  audienceLabel: string;
  resize: ReturnType<typeof useRoomChatPanelWidth>;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="voople-room-chat-panel flex min-h-0 flex-col bg-[var(--background)]"
      style={{ "--room-chat-panel-width": `${resize.width}px` } as CSSProperties}
      aria-label={`Чат группы: ${audienceLabel}`}>
      <button type="button" className="voople-room-chat-panel__resize"
        aria-label="Изменить ширину чата группы"
        title="Ширина чата: стрелки, Shift — крупный шаг"
        onPointerDown={resize.onPointerDown} onPointerMove={resize.onPointerMove}
        onPointerUp={resize.onPointerEnd} onPointerCancel={resize.onPointerEnd} onKeyDown={resize.onKeyDown}>
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <header className="voople-room-chat-panel__header">
        <Hash className="h-4 w-4 shrink-0" aria-hidden="true" />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{audienceLabel}</h3>
        <IconButton label="Закрыть чат группы" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-[var(--material-row-hover)]">
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </header>
      {children}
    </aside>
  );
}
