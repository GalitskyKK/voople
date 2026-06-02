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
      style={{ "--banner-fallback": color } as React.CSSProperties}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      ) : null}
    </div>
  );
}
