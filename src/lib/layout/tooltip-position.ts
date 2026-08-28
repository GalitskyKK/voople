export type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipViewportInsets = Partial<Record<TooltipSide, number>>;

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
  insets = {},
}: {
  anchor: RectLike;
  tooltip: { width: number; height: number };
  viewport: { width: number; height: number };
  preferredSide: TooltipSide;
  gap?: number;
  padding?: number;
  insets?: TooltipViewportInsets;
}) {
  const bounds = {
    top: padding + (insets.top ?? 0),
    right: padding + (insets.right ?? 0),
    bottom: padding + (insets.bottom ?? 0),
    left: padding + (insets.left ?? 0),
  };
  const fits = {
    top: anchor.top - bounds.top >= tooltip.height + gap,
    right: viewport.width - bounds.right - anchor.right >= tooltip.width + gap,
    bottom: viewport.height - bounds.bottom - anchor.bottom >= tooltip.height + gap,
    left: anchor.left - bounds.left >= tooltip.width + gap,
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
    left: Math.max(bounds.left, Math.min(left, viewport.width - tooltip.width - bounds.right)),
    top: Math.max(bounds.top, Math.min(top, viewport.height - tooltip.height - bounds.bottom)),
    side,
  };
}
