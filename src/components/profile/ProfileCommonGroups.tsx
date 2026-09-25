"use client";

import { useAuthGate } from "@/components/auth/AuthGateContext";
import { trpc } from "@/lib/trpc/client";

export function ProfileCommonGroups({ userId, isOwner, onNavigate }: {
  userId: string;
  isOwner: boolean;
  onNavigate?: (href: string) => void;
}) {
  const { authenticated } = useAuthGate();
  const query = trpc.profile.commonGroups.useQuery({ userId }, { enabled: authenticated });
  if (!authenticated) return null;
  return (
    <section className="voople-profile-common-groups min-w-0 px-1 py-2" aria-label={isOwner ? "Ваши группы" : "Общие группы"}>
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{isOwner ? "Ваши группы" : "Общие группы"} · {query.data?.count ?? 0}</h2>
      {query.isLoading ? <p className="mt-3 text-sm text-[var(--app-muted)]">Загрузка…</p> : null}
      {query.error ? <p role="alert" className="mt-3 text-sm text-red-400">Не удалось загрузить общие группы</p> : null}
      {query.data?.count === 0 ? <p className="mt-3 text-sm text-[var(--app-muted)]">{isOwner ? "У вас пока нет групп" : "Пока нет общих групп"}</p> : null}
      {query.data?.groups.length ? <ul className="mt-3 space-y-1">
        {query.data.groups.map((group) => <li key={group.id}>
          <a href={`/messages/${group.id}`} onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(`/messages/${group.id}`); } : undefined}
            className="flex min-w-0 items-center justify-between gap-2 rounded-[var(--app-radius-md)] px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]">
            <span className="truncate">{group.name}</span>
            {group.tag ? <span className="shrink-0 text-xs text-[var(--app-muted)]">{group.tag}</span> : null}
          </a>
        </li>)}
      </ul> : null}
      {query.data && query.data.count > query.data.groups.length ? <p className="mt-2 text-xs text-[var(--app-muted)]">+{query.data.count - query.data.groups.length}</p> : null}
    </section>
  );
}
