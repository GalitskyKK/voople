"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Palette, Undo2 } from "lucide-react";

import { CanvasSaveStatusBar } from "@/components/profile/canvas/CanvasSaveStatus";
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import { useCanvasRealtime } from "@/hooks/useCanvasRealtime";
import type { CanvasSaveStatus } from "@/hooks/useProfileCanvasStrokes";
import {
  BRUSH_SIZE_DEFAULT,
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
} from "@/lib/canvas/brush";
import { renderStrokesOnCanvas } from "@/lib/canvas/render-strokes";
import { drawStrokeOnContext } from "@/lib/canvas/stroke-path";
import { useCanvasSize } from "@/lib/canvas/use-canvas-size";
import { cn } from "@/lib/utils";
import {
  CANVAS_BRUSH_COLORS,
  type CanvasBrushColor,
  type Point,
  type Stroke,
} from "@/types/canvas";
import { Slider as BrushSlider } from "@/components/ui/Slider";

type ProfileCanvasProps = {
  profileUserId: string;
  profileOwnerId: string;
  viewerId?: string | null;
  strokes: Stroke[];
  saveStatus: CanvasSaveStatus;
  onPersistStroke: (stroke: Stroke) => void;
  onAppendStroke: (stroke: Stroke) => void;
  onRemoveStroke: (strokeId: string) => void;
  onClearAll: () => void;
  onUndoLastOwn: () => Stroke | null;
  onSyncFromServer: () => void;
  canClear?: boolean;
  canUndo?: boolean;
  className?: string;
};

function pointerToRelativePoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  rect: DOMRect,
): Point {
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
}

type RemoteDraft = {
  userId: string;
  points: Point[];
  color: string;
  size: number;
};

export function ProfileCanvas({
  profileUserId,
  profileOwnerId,
  viewerId = null,
  strokes,
  saveStatus,
  onPersistStroke,
  onAppendStroke,
  onRemoveStroke,
  onClearAll,
  onUndoLastOwn,
  onSyncFromServer,
  canClear = false,
  canUndo = false,
  className,
}: ProfileCanvasProps) {
  const { theme } = useAppTheme();
  const canvasBg = theme.tokens.surface;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const strokesRef = useRef<Stroke[]>(strokes);
  const remoteDraftsRef = useRef<Map<string, RemoteDraft>>(new Map());
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const pixelSizeRef = useRef({ width: 0, height: 0 });

  const [brushColor, setBrushColor] = useState<CanvasBrushColor>("#000000");
  const [brushSize, setBrushSize] = useState(BRUSH_SIZE_DEFAULT);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderStrokesOnCanvas(
      ctx,
      strokesRef.current,
      pixelSizeRef.current,
      activeStrokeRef.current,
      canvasBg,
    );

    for (const draft of remoteDraftsRef.current.values()) {
      drawStrokeOnContext(
        ctx,
        {
          id: "draft",
          userId: draft.userId,
          color: draft.color,
          size: draft.size,
          points: draft.points,
        },
        { size: pixelSizeRef.current },
      );
    }
  }, [canvasBg]);

  useEffect(() => {
    strokesRef.current = strokes;
    redrawCanvas();
  }, [strokes, redrawCanvas]);

  const handleIncomingStroke = useCallback(
    (stroke: Stroke) => {
      remoteDraftsRef.current.delete(stroke.id);
      onAppendStroke(stroke);
    },
    [onAppendStroke],
  );

  const handleIncomingDrawing = useCallback(
    (strokeId: string, userId: string, points: Point[], color: string, size: number) => {
      if (userId === viewerId) return;
      remoteDraftsRef.current.set(strokeId, {
        userId,
        points,
        color,
        size,
      });
      redrawCanvas();
    },
    [redrawCanvas, viewerId],
  );

  const handleRemoveStroke = useCallback(
    (strokeId: string) => {
      remoteDraftsRef.current.delete(strokeId);
      strokesRef.current = strokesRef.current.filter((item) => item.id !== strokeId);
      onRemoveStroke(strokeId);
      redrawCanvas();
    },
    [onRemoveStroke, redrawCanvas],
  );

  const { emitDrawing, emitStrokeEnd, emitClear, emitUndo, canDraw } = useCanvasRealtime({
    profileUserId,
    profileOwnerId,
    viewerId,
    onIncomingStroke: handleIncomingStroke,
    onIncomingDrawing: handleIncomingDrawing,
    onRemoveStroke: handleRemoveStroke,
    onSyncFromServer,
  });

  useCanvasSize(containerRef, canvasRef, (size) => {
    pixelSizeRef.current = size;
    redrawCanvas();
  });

  const drawStroke = useCallback((stroke: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawStrokeOnContext(ctx, stroke, { size: pixelSizeRef.current });
  }, []);

  const finishStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const active = activeStrokeRef.current;
    activeStrokeRef.current = null;

    if (!active || active.points.length < 2) {
      activePointsRef.current = [];
      redrawCanvas();
      return;
    }

    const stroke: Stroke = {
      ...active,
      points: [...active.points],
    };

    onPersistStroke(stroke);
    emitStrokeEnd(stroke);
    activePointsRef.current = [];
    redrawCanvas();
  }, [emitStrokeEnd, onPersistStroke, redrawCanvas]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || event.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = pointerToRelativePoint(event, rect);

    isDrawingRef.current = true;
    activePointsRef.current = [point];

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      userId: viewerId ?? "anonymous",
      color: brushColor,
      size: brushSize,
      points: activePointsRef.current,
    };
    activeStrokeRef.current = stroke;

    canvas.setPointerCapture(event.pointerId);
    drawStroke(stroke);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = pointerToRelativePoint(event, rect);
    activePointsRef.current.push(point);
    activeStrokeRef.current = {
      ...activeStrokeRef.current,
      points: activePointsRef.current,
    };

    drawStroke(activeStrokeRef.current);
    emitDrawing(
      activeStrokeRef.current.id,
      activePointsRef.current,
      activeStrokeRef.current.color,
      activeStrokeRef.current.size,
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    finishStroke();
  };

  const handlePointerOut = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.buttons !== 0) return;
    finishStroke();
  };

  const handleUndoClick = () => {
    if (!canUndo) return;
    const removed = onUndoLastOwn();
    if (removed) {
      emitUndo(removed.id);
      remoteDraftsRef.current.delete(removed.id);
      strokesRef.current = strokesRef.current.filter((item) => item.id !== removed.id);
      redrawCanvas();
    }
  };

  const handleClearClick = () => {
    if (!canClear) return;
    strokesRef.current = [];
    remoteDraftsRef.current.clear();
    activeStrokeRef.current = null;
    activePointsRef.current = [];
    onClearAll();
    emitClear();
    redrawCanvas();
  };

  return (
    <div
      ref={containerRef}
      className={cn("profile-canvas relative h-full min-h-[280px] w-full", className)}
    >
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
        <CanvasSaveStatusBar status={saveStatus} />
      </div>

      <canvas
        ref={canvasRef}
        className={cn(
          "profile-canvas__surface block h-full w-full touch-none rounded-2xl",
          !canDraw && "cursor-not-allowed opacity-90",
        )}
        aria-label="Интерактивный холст на обороте карточки"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerCancel={handlePointerUp}
      />

      <div
        className="profile-canvas__toolbar pointer-events-auto absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/60 p-3 backdrop-blur-sm"
        role="toolbar"
        aria-label="Инструменты рисования"
      >
        <div className="flex items-center gap-1.5" role="group" aria-label="Цвет кисти">
          <Palette className="h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]" aria-hidden />
          {CANVAS_BRUSH_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={!canDraw}
              aria-label={`Цвет ${color}`}
              aria-pressed={brushColor === color}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform",
                brushColor === color
                  ? "scale-110 border-[var(--foreground)]"
                  : "border-transparent hover:scale-105",
                color === "#ffffff" && "ring-1 ring-[color-mix(in_srgb,var(--foreground)_30%,transparent)]",
              )}
              style={{ backgroundColor: color }}
              onClick={() => setBrushColor(color)}
            />
          ))}
        </div>

        <div className="min-w-[100px] flex-1" title="Толщина кисти">
          <BrushSlider
            min={BRUSH_SIZE_MIN}
            max={BRUSH_SIZE_MAX}
            value={brushSize}
            onChange={canDraw ? setBrushSize : undefined}
            readOnly={!canDraw}
          />
        </div>

        <button
          type="button"
          disabled={!canUndo}
          aria-label="Отменить последний свой штрих"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--foreground)_20%,transparent)] disabled:opacity-40"
          onClick={handleUndoClick}
        >
          <Undo2 className="h-4 w-4" aria-hidden />
        </button>

        {canClear && (
          <button
            type="button"
            aria-label="Очистить весь холст (только владелец профиля)"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--foreground)_20%,transparent)]"
            onClick={handleClearClick}
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden />
            Очистить всё
          </button>
        )}
      </div>

      {!canDraw && (
        <p className="pointer-events-none absolute left-3 top-12 rounded-lg bg-black/50 px-2 py-1 text-xs text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">
          Войдите, чтобы рисовать
        </p>
      )}
    </div>
  );
}
