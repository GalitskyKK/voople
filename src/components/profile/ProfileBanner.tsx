import Image from "next/image";

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
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-cover object-center"
          draggable={false}
        />
      )}
    />
  );
}
