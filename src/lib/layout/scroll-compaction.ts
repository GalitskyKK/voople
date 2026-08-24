export type ScrollCompactionState = {
  compact: boolean;
  current: number;
  previous: number;
  threshold?: number;
  directionDelta?: number;
  topBoundary?: number;
};

/**
 * Direction-aware sticky compaction with hysteresis.
 * Small trackpad movements keep the current state so the surface does not
 * flicker while a user reads near the threshold.
 */
export function resolveScrollCompaction({
  compact,
  current,
  previous,
  threshold = 96,
  directionDelta = 12,
  topBoundary = 24,
}: ScrollCompactionState) {
  if (current <= topBoundary) return false;

  const delta = current - previous;
  if (current >= threshold && delta >= directionDelta) return true;
  if (delta <= -directionDelta) return false;
  return compact;
}
