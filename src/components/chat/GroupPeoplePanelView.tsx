"use client";

import { useMemo, useState } from "react";
import { Crown, Radio, RefreshCw, Search, UsersRound } from "lucide-react";

import { GroupAvatar } from "@/components/chat/GroupAvatar";
import type { ChatGroupMemberView } from "@/types/chat";

type GroupPeoplePanelViewProps = {
  members?: ChatGroupMemberView[];
  onlineUserIds: ReadonlySet<string>;
  loading?: boolean;
  error?: string | null;
  onRetry: () => void;
  onOpenProfile?: (username: string) => void;
};

type PeopleSort = "status" | "name";

function memberRank(member: ChatGroupMemberView, onlineUserIds: ReadonlySet<string>) {
  if (member.activeRoom) return 0;
  if (onlineUserIds.has(member.id)) return 1;
  return 2;
}

export function GroupPeoplePanelView({ members, onlineUserIds, loading = false, error, onRetry, onOpenProfile }: GroupPeoplePanelViewProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PeopleSort>("status");

  const sorted = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    const filtered = (members ?? []).filter((member) => !needle || member.displayName.toLocaleLowerCase("ru").includes(needle) || member.username.toLocaleLowerCase("ru").includes(needle));
    return [...filtered].sort((left, right) => {
      if (sort === "name") return left.displayName.localeCompare(right.displayName, "ru");
      return memberRank(left, onlineUserIds) - memberRank(right, onlineUserIds) || left.displayName.localeCompare(right.displayName, "ru");
    });
  }, [members, onlineUserIds, query, sort]);

  if (loading && !members) return <div className="h-48 w-full animate-pulse bg-[var(--app-surface-soft)]" aria-label="Загружаем участников" />;
  if (error && !members) {
    return (
      <div className="flex min-h-56 w-full flex-col items-center justify-center gap-3 px-5 text-center" role="alert">
        <p className="text-sm font-medium">Не удалось загрузить участников</p>
        <p className="max-w-md text-xs leading-5 text-[var(--app-muted)]">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold hover:bg-[var(--app-surface-soft)]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Повторить
        </button>
      </div>
    );
  }

  const liveCount = sorted.filter((member) => member.activeRoom).length;
  const onlineCount = sorted.filter((member) => onlineUserIds.has(member.id)).length;

  return (
    <section className="voople-group-people voople-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-labelledby="group-people-title">
      <header className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 id="group-people-title" className="text-[13px] font-semibold">Люди</h2>
          <p className="mt-1 text-[10.5px] text-[var(--app-muted)]">{liveCount} в разговоре · {onlineCount} в сети</p>
        </div>
        <span className="text-[10px] text-[var(--app-muted)]">{sorted.length} всего</span>
      </header>

      <div className="voople-group-people-toolbar mb-3 grid grid-cols-[minmax(0,1fr)_minmax(12rem,0.42fr)] gap-2">
        <label className="voople-group-people-control flex h-9 min-w-0 items-center gap-2 rounded-lg px-3" htmlFor="group-people-search">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
          <input id="group-people-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск участников..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--app-muted)]" />
        </label>
        <label className="sr-only" htmlFor="group-people-sort">Сортировка</label>
        <select id="group-people-sort" value={sort} onChange={(event) => setSort(event.target.value as PeopleSort)} className="voople-group-people-control h-9 rounded-lg px-3 text-xs text-[var(--foreground)] outline-none">
          <option value="status">Сортировка: По статусу</option>
          <option value="name">Сортировка: По имени</option>
        </select>
      </div>

      <div className="voople-group-people-list overflow-hidden rounded-[13px]">
        {sorted.map((member) => (
          <GroupPeopleRow key={member.id} member={member} online={onlineUserIds.has(member.id)} onOpenProfile={onOpenProfile} />
        ))}
      </div>

      {!sorted.length ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center" role="status">
          <UsersRound className="h-5 w-5 text-[var(--app-muted)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">{query.trim() ? "Никого не нашли" : "Участников пока нет"}</p>
        </div>
      ) : null}
    </section>
  );
}

function GroupPeopleRow({ member, online, onOpenProfile }: { member: ChatGroupMemberView; online: boolean; onOpenProfile?: (username: string) => void; }) {
  const active = Boolean(member.activeRoom);
  const status = active ? `${member.activeRoom?.name ?? "Комната"} · говорит` : online ? "В сети" : "Не в сети";

  return (
    <button type="button" onClick={() => onOpenProfile?.(member.username)} disabled={!onOpenProfile} className="voople-group-people-row flex min-h-11 w-full items-center gap-3 border-b border-[var(--app-border)] px-3 text-left last:border-b-0 disabled:cursor-default">
      <GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl} accentColor={member.roleColor} size="sm" shape="square" />
      <span className="min-w-0 flex-[0_1_13rem]">
        <strong className="block truncate text-xs font-semibold">{member.displayName}</strong>
        <span className="block truncate text-[10px] text-[var(--app-muted)]">@{member.username}</span>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-[10.5px] text-[var(--app-muted)]">
        {active ? <Radio className="h-3.5 w-3.5 shrink-0 text-[var(--voople-ice)]" aria-hidden="true" /> : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${online ? "bg-emerald-400" : "bg-white/20"}`} aria-hidden="true" />}
        <span className="truncate">{status}</span>
      </span>
      {member.role === "owner" ? <span className="hidden items-center gap-1 text-[10px] text-[var(--app-muted)] sm:flex"><Crown className="h-3 w-3 text-[var(--voople-wine-bright)]" aria-hidden="true" />Владелец</span> : member.role === "admin" ? <span className="hidden text-[10px] text-[var(--app-muted)] sm:block">Администратор</span> : null}
    </button>
  );
}
