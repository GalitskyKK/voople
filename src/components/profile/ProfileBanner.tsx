import type { ProfileCustomizationView } from "@/types/domain";
import { ProfileBannerVisual } from "./ProfileBannerVisual";

type ProfileBannerProps = {
  customization: ProfileCustomizationView;
  className?: string;
};

/** Visible banner strip on profile card — 8:3 aspect, object-cover center crop. */
export function ProfileBanner({ customization, className }: ProfileBannerProps) {
  return (
    <ProfileBannerVisual
      customization={customization}
      className={className}
      renderImage={(url) => (
        // eslint-disable-next-line @next/next/no-img-element -- portable CDN image shared with Tauri.
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      )}
    />
  );
}
