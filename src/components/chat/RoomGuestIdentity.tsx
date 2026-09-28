import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";

export function RoomGuestIdentity({ name, speaking, overlay = false }: { name: string; speaking: boolean; overlay?: boolean }) {
  return <div className={`voople-room-guest-identity${overlay ? " voople-room-guest-identity--overlay" : ""}`} aria-label={`${name}${speaking ? " говорит" : ""}`}>
    <ProfileAvatarVisual displayName={name} size="sm" className={speaking ? "voople-avatar-speaking rounded-full" : undefined} />
    <span className="min-w-0 truncate text-sm font-medium">{name} · гость</span>
    {speaking ? <span className="text-xs text-[var(--material-ice)]">говорит</span> : null}
  </div>;
}
