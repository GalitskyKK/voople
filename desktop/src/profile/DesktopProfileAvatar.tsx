import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { DEFAULT_RING, resolveRingStyle } from "@/lib/customization/rings";
import type { ProfileCustomizationView } from "@/types/domain";

export function DesktopProfileAvatar({
  displayName,
  customization,
  fallbackAvatarUrl,
  size = "md",
}: {
  displayName: string;
  customization: ProfileCustomizationView;
  fallbackAvatarUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const avatarUrl =
    customization.assets.animatedAvatarUrl ?? fallbackAvatarUrl;
  const decorationUrl = customization.assets.avatarDecorationUrl;
  const ringStyle = customization.avatarRingId
    ? resolveRingStyle(customization.avatarRingId)
    : customization.flags.hasAvatarRing
      ? DEFAULT_RING
      : undefined;

  return (
    <ProfileAvatarVisual
      displayName={displayName}
      size={size}
      ringClassName={ringStyle?.className}
      avatarImage={
        avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
      decorationImage={
        decorationUrl ? (
          <img
            src={decorationUrl}
            alt=""
            className="h-full w-full max-w-none object-contain object-center"
          />
        ) : undefined
      }
    />
  );
}
