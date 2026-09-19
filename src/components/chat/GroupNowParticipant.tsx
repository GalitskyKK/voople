import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { cn } from "@/lib/utils";
import type { GroupNowParticipant as GroupNowParticipantView, GroupNowUser } from "@/types/group-now";

export function GroupNowParticipant({
  user,
  onOpenProfile,
  variant = "inline",
}: {
  user: GroupNowUser | GroupNowParticipantView;
  onOpenProfile?: (user: GroupNowUser) => void;
  variant?: "inline" | "room";
}) {
  const avatar = (
    <ProfileAvatarVisual
      displayName={user.displayName}
      size="sm"
      isOnline
      shape={variant === "room" ? "round" : "square"}
      avatarImage={user.avatarUrl ? (
        // Shared portable surface: Next Image cannot be used by the Tauri renderer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : undefined}
    />
  );

  const content = variant === "room" ? (
    <>
      {avatar}
      <span className="sr-only">{user.displayName}</span>
    </>
  ) : (
    <>
      {avatar}
      <span className="max-w-24 truncate text-xs font-medium text-[var(--foreground)]">{user.displayName}</span>
    </>
  );

  const className = cn(
    variant === "room"
      ? "voople-group-now-participant voople-group-now-participant--room relative inline-grid h-8 w-8 shrink-0 place-items-center rounded-full"
      : "inline-flex min-w-0 items-center gap-2",
    variant === "room" && "isMe" in user && user.isMe === true && "voople-group-now-participant--me",
  );

  if (!onOpenProfile || user.guest) return <span className={className}>{content}</span>;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(user)}
      className={`${className} text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]`}
      aria-label={`Открыть профиль ${user.displayName}`}
    >
      {content}
    </button>
  );
}
