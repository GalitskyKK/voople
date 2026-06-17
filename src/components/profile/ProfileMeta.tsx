import { COPY } from "@/lib/constants/copy";

type ProfileMetaProps = {
  createdAt?: string | null;
  subscriptionStartedAt?: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function ProfileMeta({ createdAt, subscriptionStartedAt }: ProfileMetaProps) {
  if (!createdAt && !subscriptionStartedAt) return null;

  return (
    <div className="flex flex-col gap-1 text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
      {createdAt && (
        <p>
          {COPY.registeredAt} {formatDate(createdAt)}
        </p>
      )}
      {subscriptionStartedAt && (
        <p>
          {COPY.subscriptionSince} {formatDate(subscriptionStartedAt)}
        </p>
      )}
    </div>
  );
}
