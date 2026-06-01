/** Нормализованная точка: x и y в диапазоне [0, 1] относительно размеров канваса */
export type Point = [number, number];

/** Один штрих на холсте профиля */
export type Stroke = {
  id: string;
  userId: string;
  color: string;
  size: number;
  points: Point[];
};

export const CANVAS_BRUSH_COLORS = ["#000000", "#ef4444", "#3b82f6", "#ffffff"] as const;

export type CanvasBrushColor = (typeof CANVAS_BRUSH_COLORS)[number];
