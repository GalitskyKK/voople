import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import type { GroupNowUser } from "@/types/group-now";

export function GroupNowParticipant({
  user,
  onOpenProfile,
  variant = "inline",
}: {
  user: GroupNowUser;
  onOpenProfile?: (user: GroupNowUser) => void;
  variant?: "inline" | "room";
}) {
  const content = (
    <>
      <ProfileAvatarVisual
        displayName={user.displayName}
        size="sm"
        isOnline
        shape="square"
        avatarImage={user.avatarUrl ? (
          // Shared portable surface: Next Image cannot be used by the Tauri renderer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : undefined}
      />
      <span className="max-w-24 truncate text-xs font-medium text-[var(--foreground)]">
        {user.displayName}
      </span>
      {variant === "room" && "isMe" in user && user.isMe ? (
        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--theme-accent)]">
          вы
        </span>
      ) : null}
    </>
  );

  const className =
    variant === "room"
      ? "inline-flex min-w-12 max-w-20 flex-col items-center gap-1 rounded-[var(--app-radius-sm)] p-1.5 text-center"
      : "inline-flex min-w-0 items-center gap-2";

  if (!onOpenProfile || user.guest) {
    return <span className={className}>{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(user)}
      className={`${className} text-left transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]`}
      aria-label={`Открыть профиль ${user.displayName}`}
    >
      {content}
    </button>
  );
}
