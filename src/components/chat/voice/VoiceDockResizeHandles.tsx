"use client";

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Scaling } from "lucide-react";

import type { VoiceDockResizeDirection } from "@/lib/livekit/voice-dock-geometry";
import { cn } from "@/lib/utils";

type VoiceDockResizeHandlesProps = {
  onStart: (direction: VoiceDockResizeDirection, event: ReactPointerEvent<HTMLElement>) => void;
  onMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onCancel: () => void;
  onKeyDown: (direction: VoiceDockResizeDirection, event: ReactKeyboardEvent<HTMLElement>) => void;
};

const HANDLES: Array<{
  direction: VoiceDockResizeDirection;
  label: string;
  className: string;
}> = [
  { direction: "n", label: "Изменить высоту окна сверху", className: "-top-1 left-4 right-4 h-3 cursor-ns-resize" },
  { direction: "e", label: "Изменить ширину окна справа", className: "-right-1 bottom-4 top-4 w-3 cursor-ew-resize" },
  { direction: "s", label: "Изменить высоту окна снизу", className: "-bottom-1 left-4 right-4 h-3 cursor-ns-resize" },
  { direction: "w", label: "Изменить ширину окна слева", className: "-left-1 bottom-4 top-4 w-3 cursor-ew-resize" },
  { direction: "ne", label: "Изменить размер окна сверху справа", className: "-right-1 -top-1 h-5 w-5 cursor-nesw-resize" },
  { direction: "se", label: "Изменить размер окна снизу справа", className: "-bottom-1 -right-1 h-5 w-5 cursor-nwse-resize" },
  { direction: "sw", label: "Изменить размер окна снизу слева", className: "-bottom-1 -left-1 h-5 w-5 cursor-nesw-resize" },
  { direction: "nw", label: "Изменить размер окна сверху слева", className: "-left-1 -top-1 h-5 w-5 cursor-nwse-resize" },
];

export function VoiceDockResizeHandles({
  onStart,
  onMove,
  onEnd,
  onCancel,
  onKeyDown,
}: VoiceDockResizeHandlesProps) {
  return HANDLES.map(({ direction, label, className }) => (
    <button
      key={direction}
      type="button"
      data-voice-dock-control=""
      data-voice-dock-resize={direction}
      aria-label={label}
      className={cn(
        "absolute z-20 touch-none rounded-sm opacity-0 outline-none transition focus-visible:bg-[var(--app-accent-soft)] focus-visible:opacity-100",
        className,
      )}
      onPointerDown={(event) => {
        event.stopPropagation();
        onStart(direction, event);
      }}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onCancel}
      onKeyDown={(event) => onKeyDown(direction, event)}
    >
      {direction === "se" ? (
        <Scaling className="absolute bottom-1 right-1 h-3.5 w-3.5 text-[var(--app-muted)]" />
      ) : null}
    </button>
  ));
}
