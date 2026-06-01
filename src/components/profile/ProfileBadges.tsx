type ProfileBadgesProps = {
  subscriptionStartedAt?: string | null;
};

export function ProfileBadges({ subscriptionStartedAt }: ProfileBadgesProps) {
  if (!subscriptionStartedAt) return null;

  return (
    <div className="flex flex-wrap gap-1 text-sm opacity-90" aria-label="Бейджи профиля">
      <span title="Voople+" aria-label="Voople+">
        ✦
      </span>
    </div>
  );
}
