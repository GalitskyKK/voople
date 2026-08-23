import { Radio, UsersRound } from "lucide-react";
import type { CSSProperties } from "react";

import { GroupAvatar } from "./GroupAvatar";

export function GroupCommunityPreviewCard({
  name,
  avatarUrl,
  bannerUrl,
  icon,
  accentColor,
  tag,
  description,
}: {
  name: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  icon: string | null;
  accentColor: string;
  tag: string | null;
  description: string | null;
}) {
  return (
    <aside className="xl:sticky xl:top-4 xl:self-start" aria-label="Предпросмотр профиля сообщества">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">Предпросмотр</p>
      <article className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-md)]" style={{ "--group-accent": accentColor } as CSSProperties}>
        <div className="h-28 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--group-accent)_72%,#111),color-mix(in_srgb,var(--group-accent)_28%,var(--app-surface)))] bg-cover bg-center" style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined} />
        <div className="px-4 pb-4">
          <div className="-mt-8"><GroupAvatar name={name} avatarUrl={avatarUrl} icon={icon} accentColor={accentColor} size="lg" /></div>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2"><h3 className="truncate text-lg font-bold">{name}</h3>{tag ? <span className="rounded-md bg-[color-mix(in_srgb,var(--group-accent)_14%,var(--app-surface-soft))] px-1.5 py-0.5 text-[10px] font-bold text-[var(--group-accent)]">{tag}</span> : null}</div>
          <p className="mt-1 flex items-center gap-3 text-xs text-[var(--app-muted)]"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />онлайн</span><span className="inline-flex items-center gap-1"><UsersRound className="h-3 w-3" />участники</span></p>
          {description ? <p className="mt-3 line-clamp-4 text-xs leading-5 text-[var(--app-muted)]">{description}</p> : <p className="mt-3 text-xs text-[var(--app-muted)]">Добавьте короткое описание сообщества.</p>}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--app-accent-soft)] px-3 py-2 text-xs font-medium text-[var(--theme-accent)]"><Radio className="h-3.5 w-3.5" />Комната сообщества</div>
        </div>
      </article>
    </aside>
  );
}
