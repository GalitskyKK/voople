/** Диапазон UI-слайдера толщины кисти */
export const BRUSH_SIZE_MIN = 1;
export const BRUSH_SIZE_MAX = 20;
export const BRUSH_SIZE_DEFAULT = 3;

/** Переводит значение слайдера (1–20) в толщину линии в пикселях */
export function brushSizeToPixels(brushSize: number, canvasMinSide: number): number {
  const normalized = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, brushSize));
  return Math.max(0.75, normalized * canvasMinSide * 0.0022);
}
