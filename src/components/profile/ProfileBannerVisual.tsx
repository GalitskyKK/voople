import type { ReactNode } from "react";

import { DEFAULT_THEME } from "@/lib/constants/theme";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";

type ProfileBannerVisualProps = {
  customization: ProfileCustomizationView;
  className?: string;
  renderImage?: (url: string) => ReactNode;
};

export function ProfileBannerVisual({
  customization,
  className,
  renderImage,
}: ProfileBannerVisualProps) {
  const url = customization.flags.hasBanner
    ? customization.bannerValue.url
    : undefined;
  const color =
    customization.bannerValue.color ?? DEFAULT_THEME.bannerColor;

  return (
    <div
      className={cn(
        "relative aspect-[8/3] w-full shrink-0 overflow-hidden bg-[color:var(--banner-fallback)]",
        className,
      )}
      style={{
        "--banner-fallback": color,
        background: url
          ? undefined
          : `radial-gradient(circle at 78% 15%, color-mix(in srgb, ${color} 48%, #8b7ec8) 0%, transparent 34%), linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #090a12))`,
      } as React.CSSProperties}
    >
      {url && renderImage ? renderImage(url) : null}
    </div>
  );
}
