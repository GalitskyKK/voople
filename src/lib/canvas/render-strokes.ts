import { drawStrokeOnContext } from "@/lib/canvas/stroke-path";
import type { CanvasPixelSize } from "@/lib/canvas/use-canvas-size";
import type { Stroke } from "@/types/canvas";

const CANVAS_BG = "#1a1a2e";

/** Полная перерисовка холста по массиву штрихов */
export function renderStrokesOnCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  size: CanvasPixelSize,
  activeStroke?: Stroke | null,
) {
  const { width, height } = size;
  if (width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    drawStrokeOnContext(ctx, stroke, { size });
  }

  if (activeStroke && activeStroke.points.length > 0) {
    drawStrokeOnContext(ctx, activeStroke, { size });
  }
}
