import type { BadgeDef } from "@/lib/badges/registry";
import { publicAssetUrl } from "@/lib/object-storage";
import { cn } from "@/lib/utils";

export function BadgeArtwork({ badge, className }: { badge: BadgeDef; className?: string }) {
  const imageUrl = publicAssetUrl(badge.imageKey);

  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- achievement assets may be animated later.
    <img src={imageUrl} alt="" className={cn("object-contain", className)} loading="lazy" />
  ) : (
    <span aria-hidden className={className}>{badge.emoji}</span>
  );
}
