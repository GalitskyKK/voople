"use client";
import { GroupAvatar } from "@/components/chat/GroupAvatar";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
export function ProfileCommonGroupsView({ isOwner, groups, count, loading, error, onNavigate }: {
  isOwner: boolean; groups: {id: string; name: string; tag: string | null}[]; count: number;
  loading: boolean; error: boolean; onNavigate?: (href: string) => void;
}) {
  const orbit = useInterfaceDesign() === "orbit";
  return (
    <section className="voople-profile-common-groups min-w-0 px-1 py-2" aria-label={isOwner ? "Ваши группы" : "Общие группы"}>
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{isOwner ? "Ваши группы" : "Общие группы"} · {count ?? 0}</h2>
      {loading ? <p className="mt-3 text-sm text-[var(--app-muted)]">Загрузка…</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-400">Не удалось загрузить общие группы</p> : null}
      {count === 0 ? <p className="mt-3 text-sm text-[var(--app-muted)]">{isOwner ? "У вас пока нет групп" : "Пока нет общих групп"}</p> : null}
      {groups.length ? <ul className="mt-3 space-y-1">
        {groups.map((group) => <li key={group.id}>
          <a href={`/messages/${group.id}`} onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(`/messages/${group.id}`); } : undefined}
            className="voople-profile-common-groups__link flex min-w-0 items-center justify-between gap-2 rounded-[var(--app-radius-md)] px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]">
            {orbit ? <GroupAvatar name={group.name} avatarUrl={null} icon={null} accentColor={null} shape="square" size="md" /> : null}<span className="min-w-0 flex-1 truncate">{group.name}</span>
            {group.tag ? <span className="shrink-0 text-xs text-[var(--app-muted)]">{group.tag}</span> : null}
          </a>
        </li>)}
      </ul> : null}
      {count > groups.length ? <p className="mt-2 text-xs text-[var(--app-muted)]">+{count - groups.length}</p> : null}
    </section>
  );
}
