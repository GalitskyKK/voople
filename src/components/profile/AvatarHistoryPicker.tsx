import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";

type AvatarHistoryItem = { url: string; key: string };

export function AvatarHistoryPicker({
  avatars,
  hasVooplePlus,
  pending,
  onSelect,
}: {
  avatars: AvatarHistoryItem[] | undefined;
  hasVooplePlus: boolean;
  pending: boolean;
  onSelect: (key: string) => void;
}) {
  if (!avatars?.length) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Недавние аватары</p>
        <span className="text-xs text-[var(--app-muted)]">
          {hasVooplePlus ? "до 12 с Voople+" : "3 бесплатно"}
        </span>
        {!hasVooplePlus ? <VooplePlusBadge locked /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {avatars.map((avatar) => (
          <button
            key={avatar.key}
            type="button"
            disabled={pending}
            onClick={() => onSelect(avatar.key)}
            className="h-16 w-16 overflow-hidden rounded-full border border-[var(--app-border)] transition hover:border-(--theme-accent)"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded media URL */}
            <img src={avatar.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
