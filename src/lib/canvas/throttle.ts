/** Простой throttle для emitDrawing (~50 ms) */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  intervalMs: number,
): (...args: Args) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Args) => {
    const now = Date.now();
    const elapsed = now - lastCall;

    if (elapsed >= intervalMs) {
      lastCall = now;
      fn(...args);
      return;
    }

    if (timeoutId !== null) return;

    timeoutId = setTimeout(() => {
      timeoutId = null;
      lastCall = Date.now();
      fn(...args);
    }, intervalMs - elapsed);
  };
}
