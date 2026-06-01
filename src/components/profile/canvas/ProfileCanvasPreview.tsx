"use client";

import { useCallback, useEffect, useRef } from "react";

import { renderStrokesOnCanvas } from "@/lib/canvas/render-strokes";
import { useCanvasSize } from "@/lib/canvas/use-canvas-size";
import { cn } from "@/lib/utils";
import type { Stroke } from "@/types/canvas";

type ProfileCanvasPreviewProps = {
  strokes: Stroke[];
  className?: string;
};

/**
 * Статичный превью-холст (как img в DevTools): без pointer-событий.
 * Показывается на обратной стороне карточки, пока режим рисования выключен.
 */
export function ProfileCanvasPreview({ strokes, className }: ProfileCanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef(strokes);

  strokesRef.current = strokes;

  const redraw = useCallback((size: { width: number; height: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderStrokesOnCanvas(ctx, strokesRef.current, size);
  }, []);

  useCanvasSize(containerRef, canvasRef, redraw);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const size = {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };
    renderStrokesOnCanvas(ctx, strokes, size);
  }, [strokes]);

  return (
    <div
      ref={containerRef}
      className={cn("profile-canvas-preview relative h-full min-h-[280px] w-full", className)}
    >
      <canvas
        ref={canvasRef}
        className="profile-canvas-preview__surface pointer-events-none block h-full w-full rounded-2xl"
        aria-hidden
      />
    </div>
  );
}
