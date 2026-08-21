"use client";

import { useState } from "react";

import type { BadgeDef } from "@/lib/badges/registry";
import { publicAssetUrl } from "@/lib/object-storage/urls";
import { cn } from "@/lib/utils";

export function BadgeArtwork({ badge, className }: { badge: BadgeDef; className?: string }) {
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const imageUrl =
    failedImageKey === badge.imageKey ? null : publicAssetUrl(badge.imageKey);

  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- achievement assets may be animated later.
    <img
      src={imageUrl}
      alt=""
      className={cn("object-contain", className)}
      loading="lazy"
      onError={() => setFailedImageKey(badge.imageKey ?? null)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center font-semibold text-(--theme-accent)",
        className,
      )}
    >
      {badge.emoji}
    </span>
  );
}
