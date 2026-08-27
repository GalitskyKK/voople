export type TooltipSide = "top" | "right" | "bottom" | "left";

type RectLike = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export function resolveTooltipPosition({
  anchor,
  tooltip,
  viewport,
  preferredSide,
  gap = 8,
  padding = 8,
}: {
  anchor: RectLike;
  tooltip: { width: number; height: number };
  viewport: { width: number; height: number };
  preferredSide: TooltipSide;
  gap?: number;
  padding?: number;
}) {
  const fits = {
    top: anchor.top >= tooltip.height + gap + padding,
    right: viewport.width - anchor.right >= tooltip.width + gap + padding,
    bottom: viewport.height - anchor.bottom >= tooltip.height + gap + padding,
    left: anchor.left >= tooltip.width + gap + padding,
  } satisfies Record<TooltipSide, boolean>;
  const opposite: Record<TooltipSide, TooltipSide> = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  };
  const side = fits[preferredSide]
    ? preferredSide
    : fits[opposite[preferredSide]]
      ? opposite[preferredSide]
      : preferredSide;

  let left = anchor.left + anchor.width / 2 - tooltip.width / 2;
  let top = anchor.top + anchor.height / 2 - tooltip.height / 2;
  if (side === "top") top = anchor.top - tooltip.height - gap;
  if (side === "right") left = anchor.right + gap;
  if (side === "bottom") top = anchor.bottom + gap;
  if (side === "left") left = anchor.left - tooltip.width - gap;

  return {
    left: Math.max(padding, Math.min(left, viewport.width - tooltip.width - padding)),
    top: Math.max(padding, Math.min(top, viewport.height - tooltip.height - padding)),
    side,
  };
}
