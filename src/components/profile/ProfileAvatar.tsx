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
          // eslint-disable-next-line @next/next/no-img-element -- portable CDN image shared with Tauri.
          <img
            src={decorationUrl}
            alt=""
            className="h-full w-full max-w-none object-contain object-center"
          />
        ) : undefined
      }
      avatarImage={
        animatedAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- portable CDN image shared with Tauri.
          <img
            src={animatedAvatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
    />
  );
}
