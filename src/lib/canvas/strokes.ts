import type { Stroke } from "@/types/canvas";

/** Последний штрих пользователя в списке (по порядку created_at / массива) */
export function findLastOwnStroke(strokes: Stroke[], userId: string | null | undefined): Stroke | null {
  if (!userId) return null;
  for (let index = strokes.length - 1; index >= 0; index -= 1) {
    const stroke = strokes[index];
    if (stroke?.userId === userId) return stroke;
  }
  return null;
}
