export type ContextMenuAnchor =
  | { kind: "point"; x: number; y: number }
  | { kind: "rect"; left: number; top: number; right: number; bottom: number };

export function resolveContextMenuPosition({
  anchor, menuWidth, menuHeight, viewportWidth, viewportHeight, margin = 8, side = "bottom",
}: {
  anchor: ContextMenuAnchor;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
  side?: "bottom" | "right";
}) {
  const safeWidth = Math.min(menuWidth, Math.max(0, viewportWidth - margin * 2));
  const safeHeight = Math.min(menuHeight, Math.max(0, viewportHeight - margin * 2));
  if (side === "right" && anchor.kind === "rect") {
    const requested = anchor.right + 4 + safeWidth <= viewportWidth - margin ? anchor.right + 4 : anchor.left - safeWidth - 4;
    return { left: Math.max(margin, Math.min(requested, viewportWidth - safeWidth - margin)), top: Math.max(margin, Math.min(anchor.top, viewportHeight - safeHeight - margin)) };
  }
  const x = anchor.kind === "point" ? anchor.x : anchor.left;
  const bottom = anchor.kind === "point" ? anchor.y : anchor.bottom;
  const top = anchor.kind === "point" ? anchor.y : anchor.top;
  const requestedLeft = x + safeWidth > viewportWidth - margin
    ? (anchor.kind === "point" ? x : anchor.right) - safeWidth
    : x;
  const requestedTop = bottom + safeHeight > viewportHeight - margin
    ? top - safeHeight
    : bottom;
  return {
    left: Math.max(margin, Math.min(requestedLeft, viewportWidth - safeWidth - margin)),
    top: Math.max(margin, Math.min(requestedTop, viewportHeight - safeHeight - margin)),
  };
}
