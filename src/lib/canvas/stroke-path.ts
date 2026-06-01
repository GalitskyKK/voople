import { getStroke } from "perfect-freehand";

import { brushSizeToPixels } from "@/lib/canvas/brush";
import type { Point, Stroke } from "@/types/canvas";

export type CanvasPixelSize = {
  width: number;
  height: number;
};

/** Преобразует нормализованные точки в пиксели для perfect-freehand */
export function pointsToAbsolute(points: Point[], size: CanvasPixelSize): number[][] {
  return points.map(([x, y]) => [x * size.width, y * size.height]);
}

/**
 * Строит SVG path из outline-точек perfect-freehand.
 * Алгоритм из документации библиотеки.
 */
export function getSvgPathFromOutline(outline: number[][]): string {
  if (outline.length === 0) return "";

  const max = outline.length - 1;
  const pathData = outline.reduce<string[]>(
    (acc, point, index) => {
      const [x, y] = point;
      if (index === 0) {
        acc.push(`M ${x} ${y}`);
        return acc;
      }
      const [prevX, prevY] = outline[index - 1] ?? point;
      const midX = (prevX + x) / 2;
      const midY = (prevY + y) / 2;
      acc.push(`Q ${prevX} ${prevY} ${midX} ${midY}`);
      if (index === max) {
        acc.push(`L ${x} ${y}`);
      }
      return acc;
    },
    [],
  );

  return `${pathData.join(" ")} Z`;
}

export type DrawStrokeOptions = {
  size: CanvasPixelSize;
};

/**
 * Рисует один штрих на 2D-контексте через Path2D + perfect-freehand.
 * Координаты в stroke.points — нормализованные (0–1).
 */
export function drawStrokeOnContext(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  options: DrawStrokeOptions,
): void {
  if (stroke.points.length < 1) return;

  const { width, height } = options.size;
  const minSide = Math.min(width, height);
  const brushPx = brushSizeToPixels(stroke.size, minSide);

  const absolutePoints = pointsToAbsolute(stroke.points, options.size);
  const outline = getStroke(absolutePoints, {
    size: brushPx,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
  });

  const pathData = getSvgPathFromOutline(outline);
  if (!pathData) return;

  const path = new Path2D(pathData);
  ctx.fillStyle = stroke.color;
  ctx.fill(path);
}
