type ProfileMetaProps = {
  createdAt?: string | null;
  subscriptionStartedAt?: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDatabaseDate(iso));
}

export function ProfileMeta({ createdAt, subscriptionStartedAt }: ProfileMetaProps) {
  if (!createdAt && !subscriptionStartedAt) return null;

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] text-[color-mix(in_srgb,var(--foreground)_48%,transparent)]">
      {createdAt ? <span className="truncate">На Voople {formatDate(createdAt)}</span> : null}
      {createdAt && subscriptionStartedAt ? <span aria-hidden>·</span> : null}
      {subscriptionStartedAt ? <span className="truncate">Voople+ {formatDate(subscriptionStartedAt)}</span> : null}
    </div>
  );
}
import { parseDatabaseDate } from "@/lib/format/database-date";
