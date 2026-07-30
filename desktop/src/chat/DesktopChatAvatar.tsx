import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { resolveRingStyle } from "@/lib/customization/rings";

export function DesktopChatAvatar({
  displayName,
  avatarUrl,
  decorationUrl,
  ringId,
  isOnline = false,
  className,
}: {
  displayName: string;
  avatarUrl?: string | null;
  decorationUrl?: string | null;
  ringId?: string | null;
  isOnline?: boolean;
  className?: string;
}) {
  return (
    <ProfileAvatarVisual
      displayName={displayName}
      size="sm"
      className={className}
      isOnline={isOnline}
      ringClassName={resolveRingStyle(ringId)?.className}
      avatarImage={
        avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
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
