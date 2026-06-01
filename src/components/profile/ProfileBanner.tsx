import { DEFAULT_THEME } from "@/lib/constants/theme";
import { cn } from "@/lib/utils";
import type { ProfileCustomizationView } from "@/types/domain";

type ProfileBannerProps = {
  customization: ProfileCustomizationView;
};

export function ProfileBanner({ customization }: ProfileBannerProps) {
  const url = customization.flags.hasBanner ? customization.bannerValue.url : undefined;
  const color = customization.bannerValue.color ?? DEFAULT_THEME.bannerColor;

  return (
    <div
      className={cn("h-[110px] w-full shrink-0 bg-cover bg-center md:h-[120px]")}
      style={{
        backgroundColor: color,
        backgroundImage: url ? `url(${url})` : undefined,
      }}
    />
  );
}
