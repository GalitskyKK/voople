import Image from "next/image";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { DEFAULT_RING, resolveRingStyle } from "@/lib/customization/rings";

export type ProfileAvatarProps = {
  displayName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Включает дефолтное кольцо (акцент темы). Игнорируется, если задан `ringId`. */
  ring?: boolean;
  /** Конкретное кольцо из магазина (`avatar_ring_id`); приоритетнее `ring`. */
  ringId?: string | null;
  decorationUrl?: string | null;
  animatedAvatarUrl?: string | null;
  isOnline?: boolean;
};

const imageSizes = { sm: 32, md: 72, lg: 80 } as const;

export function ProfileAvatar({
  displayName,
  className,
  size = "md",
  ring = false,
  ringId,
  decorationUrl,
  animatedAvatarUrl,
  isOnline = false,
}: ProfileAvatarProps) {
  const ringStyle = ringId ? resolveRingStyle(ringId) : ring ? DEFAULT_RING : null;

  return (
    <ProfileAvatarVisual
      displayName={displayName}
      size={size}
      className={className}
      ringClassName={ringStyle?.className}
      isOnline={isOnline}
      decorationImage={
        decorationUrl ? (
          <Image
            src={decorationUrl}
            alt=""
            width={288}
            height={288}
            unoptimized
            className="h-full w-full max-w-none object-contain object-center"
          />
        ) : undefined
      }
      avatarImage={
        animatedAvatarUrl ? (
          <Image
            src={animatedAvatarUrl}
            alt=""
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : undefined
      }
    />
  );
}
