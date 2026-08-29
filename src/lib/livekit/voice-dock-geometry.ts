export type VoiceDockResizeDirection =
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

export type VoiceDockRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ResizeVoiceDockRectInput = {
  rect: VoiceDockRect;
  direction: VoiceDockResizeDirection;
  deltaX: number;
  deltaY: number;
  viewportWidth: number;
  viewportHeight: number;
  gap: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function resizeVoiceDockRect({
  rect,
  direction,
  deltaX,
  deltaY,
  viewportWidth,
  viewportHeight,
  gap,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
}: ResizeVoiceDockRectInput): VoiceDockRect {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const viewportMaxWidth = Math.max(1, viewportWidth - gap * 2);
  const viewportMaxHeight = Math.max(1, viewportHeight - gap * 2);
  const resolvedMaxWidth = Math.min(maxWidth, viewportMaxWidth);
  const resolvedMaxHeight = Math.min(maxHeight, viewportMaxHeight);
  const resolvedMinWidth = Math.min(minWidth, resolvedMaxWidth);
  const resolvedMinHeight = Math.min(minHeight, resolvedMaxHeight);

  let width = Math.min(rect.width, resolvedMaxWidth);
  let height = Math.min(rect.height, resolvedMaxHeight);
  let left = rect.left;
  let top = rect.top;

  if (direction.includes("e")) {
    width = clamp(
      rect.width + deltaX,
      resolvedMinWidth,
      Math.min(resolvedMaxWidth, viewportWidth - gap - rect.left),
    );
  } else if (direction.includes("w")) {
    width = clamp(
      rect.width - deltaX,
      resolvedMinWidth,
      Math.min(resolvedMaxWidth, right - gap),
    );
    left = right - width;
  }

  if (direction.includes("s")) {
    height = clamp(
      rect.height + deltaY,
      resolvedMinHeight,
      Math.min(resolvedMaxHeight, viewportHeight - gap - rect.top),
    );
  } else if (direction.includes("n")) {
    height = clamp(
      rect.height - deltaY,
      resolvedMinHeight,
      Math.min(resolvedMaxHeight, bottom - gap),
    );
    top = bottom - height;
  }

  return { left, top, width, height };
}
