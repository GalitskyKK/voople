import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import type { GroupNowUser } from "@/types/group-now";

export function GroupNowParticipant({
  user,
  onOpenProfile,
}: {
  user: GroupNowUser;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const content = (
    <>
      <ProfileAvatarVisual
        displayName={user.displayName}
        size="sm"
        isOnline
        avatarImage={user.avatarUrl ? (
          // Shared portable surface: Next Image cannot be used by the Tauri renderer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : undefined}
      />
      <span className="max-w-24 truncate text-xs font-medium text-[var(--foreground)]">
        {user.displayName}
      </span>
    </>
  );

  if (!onOpenProfile) {
    return <span className="inline-flex min-w-0 items-center gap-2">{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(user)}
      className="inline-flex min-w-0 items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
      aria-label={`Открыть профиль ${user.displayName}`}
    >
      {content}
    </button>
  );
}
