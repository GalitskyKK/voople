"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Maximize2, Palette, Undo2 } from "lucide-react";

import {
  BRUSH_SIZE_DEFAULT,
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
} from "@/lib/canvas/brush";
import {
  BANNER_EXPORT_HEIGHT,
  BANNER_EXPORT_WIDTH,
  BANNER_SAFE_WIDTH_RATIO,
} from "@/lib/profile/banner-spec";
import { cn } from "@/lib/utils";
import { CANVAS_BRUSH_COLORS, type CanvasBrushColor } from "@/types/canvas";
import { Slider as BrushSlider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type LocalStroke = {
  color: string;
  size: number;
  points: { x: number; y: number }[];
};

type BannerDrawEditorProps = {
  backgroundColor?: string;
  className?: string;
  busy?: boolean;
  onExport: (file: File) => void | Promise<void>;
};

function pointerToPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: Math.min(
      BANNER_EXPORT_WIDTH,
      Math.max(0, ((event.clientX - rect.left) / rect.width) * BANNER_EXPORT_WIDTH),
    ),
    y: Math.min(
      BANNER_EXPORT_HEIGHT,
      Math.max(0, ((event.clientY - rect.top) / rect.height) * BANNER_EXPORT_HEIGHT),
    ),
  };
}

function drawLocalStroke(ctx: CanvasRenderingContext2D, stroke: LocalStroke) {
  if (stroke.points.length < 2) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i += 1) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  ctx.stroke();
}

function paintCanvas(
  canvas: HTMLCanvasElement | null,
  strokes: LocalStroke[],
  backgroundColor: string,
  active: LocalStroke | null,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, BANNER_EXPORT_WIDTH, BANNER_EXPORT_HEIGHT);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, BANNER_EXPORT_WIDTH, BANNER_EXPORT_HEIGHT);
  for (const stroke of strokes) {
    drawLocalStroke(ctx, stroke);
  }
  if (active && active.points.length >= 1) {
    drawLocalStroke(ctx, active);
  }
}

function BannerCropGuide() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute inset-y-0 left-1/2 h-full -translate-x-1/2 border-x border-dashed border-[color-mix(in_srgb,var(--foreground)_25%,transparent)]"
        style={{ width: `${BANNER_SAFE_WIDTH_RATIO * 100}%` }}
      />
    </div>
  );
}

type BannerDrawToolbarProps = {
  busy: boolean;
  brushColor: CanvasBrushColor;
  brushSize: number;
  canUndo: boolean;
  onColorChange: (color: CanvasBrushColor) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
};

function BannerDrawToolbar({
  busy,
  brushColor,
  brushSize,
  canUndo,
  onColorChange,
  onSizeChange,
  onUndo,
  onClear,
}: BannerDrawToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/40 p-2"
      role="toolbar"
      aria-label="Инструменты баннера"
    >
      <div className="flex items-center gap-1">
        <Palette className="h-4 w-4 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" aria-hidden />
        {CANVAS_BRUSH_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={busy}
            aria-pressed={brushColor === color}
            aria-label={`Цвет ${color}`}
            className={cn(
              "h-6 w-6 rounded-full border-2",
              brushColor === color ? "border-[var(--foreground)]" : "border-transparent",
            )}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
          />
        ))}
      </div>
      <div className="min-w-[80px] flex-1">
        <BrushSlider
          min={BRUSH_SIZE_MIN}
          max={BRUSH_SIZE_MAX}
          value={brushSize}
          onChange={busy ? undefined : onSizeChange}
          readOnly={busy}
        />
      </div>
      <button
        type="button"
        disabled={!canUndo || busy}
        aria-label="Отменить штрих"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[var(--foreground)] disabled:opacity-40"
        onClick={onUndo}
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={busy}
        aria-label="Очистить"
        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-2 text-xs text-[var(--foreground)]"
        onClick={onClear}
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

type BannerDrawSurfaceProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  backgroundColor: string;
  busy: boolean;
  displayClassName?: string;
  brushColor: CanvasBrushColor;
  brushSize: number;
  strokesRef: React.MutableRefObject<LocalStroke[]>;
  activeStrokeRef: React.MutableRefObject<LocalStroke | null>;
  isDrawingRef: React.MutableRefObject<boolean>;
  onRepaint: () => void;
};

function BannerDrawSurface({
  canvasRef,
  backgroundColor,
  busy,
  displayClassName,
  brushColor,
  brushSize,
  strokesRef,
  activeStrokeRef,
  isDrawingRef,
  onRepaint,
}: BannerDrawSurfaceProps) {
  useEffect(() => {
    onRepaint();
  }, [onRepaint]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (busy) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    activeStrokeRef.current = {
      color: brushColor,
      size: brushSize,
      points: [pointerToPoint(event, rect)],
    };
    canvas.setPointerCapture(event.pointerId);
    onRepaint();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    activeStrokeRef.current.points.push(pointerToPoint(event, rect));
    onRepaint();
  };

  const finishStroke = () => {
    if (!activeStrokeRef.current) return;
    if (activeStrokeRef.current.points.length >= 2) {
      strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    }
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
    onRepaint();
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]", displayClassName)}>
      <canvas
        ref={canvasRef}
        width={BANNER_EXPORT_WIDTH}
        height={BANNER_EXPORT_HEIGHT}
        className="block aspect-[8/3] w-full touch-none bg-[#14141c]"
        aria-label="Рисование баннера"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerOut={finishStroke}
        onPointerCancel={finishStroke}
      />
      <BannerCropGuide />
    </div>
  );
}

/** Banner editor at card aspect ratio (640×240). Matches profile card crop. */
export function BannerDrawEditor({
  backgroundColor = "#14141c",
  className,
  busy = false,
  onExport,
}: BannerDrawEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<LocalStroke[]>([]);
  const activeStrokeRef = useRef<LocalStroke | null>(null);
  const isDrawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState<CanvasBrushColor>(CANVAS_BRUSH_COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZE_DEFAULT);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const repaint = useCallback(() => {
    paintCanvas(canvasRef.current, strokesRef.current, backgroundColor, activeStrokeRef.current);
    setStrokeCount(strokesRef.current.length);
  }, [backgroundColor]);

  useEffect(() => {
    repaint();
  }, [repaint, expandedOpen]);

  const handleUndo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    repaint();
  };

  const handleClear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    repaint();
  };

  const commitActiveStroke = () => {
    if (!activeStrokeRef.current) return;
    if (activeStrokeRef.current.points.length >= 2) {
      strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    }
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
    repaint();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    commitActiveStroke();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", 0.9);
    });
    if (!blob) return;
    const file = new File([blob], `banner-${Date.now()}.webp`, { type: "image/webp" });
    await onExport(file);
    setExpandedOpen(false);
  };

  const surfaceProps = {
    canvasRef,
    backgroundColor,
    busy,
    brushColor,
    brushSize,
    strokesRef,
    activeStrokeRef,
    isDrawingRef,
    onRepaint: repaint,
  };

  const toolbar = (
    <BannerDrawToolbar
      busy={busy}
      brushColor={brushColor}
      brushSize={brushSize}
      canUndo={strokeCount > 0}
      onColorChange={setBrushColor}
      onSizeChange={setBrushSize}
      onUndo={handleUndo}
      onClear={handleClear}
    />
  );

  return (
    <div className={cn("space-y-3", className)}>
      {!expandedOpen && (
        <>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={() => setExpandedOpen(true)}
            >
              <Maximize2 className="h-4 w-4" />
              Большой холст
            </Button>
          </div>
          <BannerDrawSurface {...surfaceProps} displayClassName="max-h-[100px] sm:max-h-[120px]" />
          {toolbar}
          <Button type="button" variant="primary" className="w-full" disabled={busy} onClick={handleSave}>
            {busy ? "Сохранение…" : "Сохранить баннер"}
          </Button>
        </>
      )}

      <Sheet open={expandedOpen} onClose={() => setExpandedOpen(false)} className="max-w-3xl">
        <h3 className="mb-3 pe-10 text-lg font-semibold">Рисование баннера</h3>
        <BannerDrawSurface {...surfaceProps} displayClassName="max-h-[min(50vh,280px)]" />
        <div className="mt-3">{toolbar}</div>
        <Button type="button" variant="primary" className="mt-4 w-full" disabled={busy} onClick={handleSave}>
          {busy ? "Сохранение…" : "Сохранить баннер"}
        </Button>
      </Sheet>
    </div>
  );
}
