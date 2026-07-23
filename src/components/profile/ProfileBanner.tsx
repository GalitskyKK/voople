import Image from "next/image";

import { DEFAULT_THEME } from "@/lib/constants/theme";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";

type ProfileBannerProps = {
  customization: ProfileCustomizationView;
  className?: string;
};

/** Visible banner strip on profile card — 8:3 aspect, object-cover center crop. */
export function ProfileBanner({ customization, className }: ProfileBannerProps) {
  const url = customization.flags.hasBanner ? customization.bannerValue.url : undefined;
  const color = customization.bannerValue.color ?? DEFAULT_THEME.bannerColor;

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
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-cover object-center"
          draggable={false}
        />
      ) : null}
    </div>
  );
}
