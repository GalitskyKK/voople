"use client";

import { Hash, Info, Radio, Settings2, UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { RichText } from "@/components/ui/RichText";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { ChatGroupMemberView } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";
import { GroupIdentity } from "./GroupManagementTrigger";

export type GroupInfoDrawerTab = "info" | "members";
type MemberFilter = "now" | "online" | "all" | "roles";

export function GroupInfoDrawerView({
  open,
  tab,
  chatName,
  memberCount,
  groupIcon,
  groupAvatarUrl,
  groupBannerUrl,
  groupAccentColor,
  groupTag,
  canManage,
  description,
  members,
  onlineUserIds = new Set<string>(),
  roomParticipantIds = new Set<string>(),
  infoLoading,
  membersLoading,
  error,
  topics = [],
  sections = [],
  roomAction,
  onOpenChange,
  onTabChange,
  onManage,
  onInvite,
  onOpenSection,
  onOpenProfile,
}: {
  open: boolean;
  tab: GroupInfoDrawerTab;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
  canManage: boolean;
  description?: string | null;
  members?: ChatGroupMemberView[];
  onlineUserIds?: ReadonlySet<string>;
  roomParticipantIds?: ReadonlySet<string>;
  infoLoading?: boolean;
  membersLoading?: boolean;
  error?: string | null;
  topics?: string[];
  sections?: Array<{ id: string; name: string }>;
  roomAction?: ReactNode;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: GroupInfoDrawerTab) => void;
  onManage: () => void;
  onInvite: () => void;
  onOpenSection: (chatId: string) => void;
  onOpenProfile: (username: string) => void;
}) {
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("now");
  const onlineCount = members?.filter((member) => onlineUserIds.has(member.id)).length ?? 0;
  const roomCount = members?.filter((member) => roomParticipantIds.has(member.id)).length ?? 0;
  const visibleMembers = useMemo(() => {
    const source = members ?? [];
    if (memberFilter === "now") return source.filter((member) => roomParticipantIds.has(member.id));
    if (memberFilter === "online") return source.filter((member) => onlineUserIds.has(member.id));
    return source;
  }, [memberFilter, members, onlineUserIds, roomParticipantIds]);
  const show = (next: GroupInfoDrawerTab) => {
    onTabChange(next);
    onOpenChange(true);
  };

  return (
    <>
      <button type="button" onClick={() => show("info")} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]" aria-label={`Информация о группе ${chatName}`}>
        <GroupIdentity chatName={chatName} memberCount={memberCount} groupIcon={groupIcon} groupAvatarUrl={groupAvatarUrl} groupAccentColor={groupAccentColor} groupTag={groupTag} />
      </button>
      <button type="button" onClick={() => show("members")} className="hidden h-9 w-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] sm:inline-flex" aria-label="Участники группы" title="Участники">
        <UsersRound className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => show("info")} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]" aria-label="Информация о группе" title="Информация">
        <Info className="h-4 w-4" />
      </button>

      <Sheet open={open} onClose={() => onOpenChange(false)} placement="right" ariaLabel={`Информация о группе ${chatName}`}>
        <div className="-mx-5 -mt-5">
          <div className="h-36 bg-[var(--app-accent-soft)] bg-cover bg-center" style={groupBannerUrl ? { backgroundImage: `url("${groupBannerUrl}")` } : undefined} />
          <div className="px-5">
            <div className="-mt-9 flex items-end justify-between gap-3">
              <GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" />
              {canManage ? (
                <button type="button" onClick={onManage} className="mb-1 inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-medium hover:bg-[var(--app-surface-soft)]">
                  <Settings2 className="h-4 w-4" /> Настройки
                </button>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-semibold">{chatName}</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">{memberCount} участников{groupTag ? ` · ${groupTag}` : ""}</p>
            {onlineCount || roomCount ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {roomCount ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-[var(--theme-accent)]"><Radio className="h-3.5 w-3.5" />{roomCount} разговаривают</span> : null}
                {onlineCount ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />{onlineCount} онлайн</span> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[var(--app-surface-soft)] p-1">
          {([ ["info", "О группе"], ["members", "Участники"] ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => onTabChange(id)} className={cn("rounded-lg px-3 py-2 text-sm transition", tab === id ? "bg-[var(--app-surface)] font-medium shadow-[var(--app-shadow-sm)]" : "text-[var(--app-muted)]")} aria-current={tab === id ? "page" : undefined}>{label}</button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-400" role="alert">{error}</p> : null}

        {!error && tab === "info" ? (
          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--app-muted)]">
            {infoLoading ? <div className="h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : description ? <RichText text={description} /> : <p>Описание сообщества пока не добавлено.</p>}
            {roomCount ? <section className="rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_32%,var(--app-border))] bg-[var(--app-accent-soft)] p-3" aria-label="Активная комната"><div className="flex items-center gap-2 text-[var(--theme-accent)]"><Radio className="h-4 w-4" /><strong>{roomCount} сейчас в комнате</strong></div>{roomAction ? <div className="mt-3">{roomAction}</div> : null}</section> : null}
            {topics.length ? <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Темы</h3><div className="mt-2 flex flex-wrap gap-1.5">{topics.map((topic) => <span key={topic} className="rounded-full bg-[var(--app-surface-soft)] px-2.5 py-1 text-xs text-[var(--foreground)]">{topic}</span>)}</div></section> : null}
            {sections.length ? <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Разделы</h3><div className="mt-2 space-y-1">{sections.map((section) => <button key={section.id} type="button" onClick={() => onOpenSection(section.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--app-surface-soft)]"><Hash className="h-3.5 w-3.5 text-[var(--theme-accent)]" /><span className="truncate">{section.name}</span></button>)}</div></section> : null}
            <div className="grid gap-2 border-t border-[var(--app-border)] pt-4 sm:grid-cols-2"><button type="button" onClick={onInvite} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--theme-accent)] px-3 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" />Пригласить</button>{canManage ? <button type="button" onClick={onManage} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--app-surface-soft)]"><Settings2 className="h-4 w-4" />Настройки группы</button> : null}</div>
          </div>
        ) : !error ? (
          <div className="mt-4">
            <div className="voople-scroll flex gap-1 overflow-x-auto rounded-xl bg-[var(--app-surface-soft)] p-1" aria-label="Фильтр участников">
              {([ ["now", "Сейчас"], ["online", "Онлайн"], ["all", "Все"], ["roles", "Роли"] ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setMemberFilter(id)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs transition", memberFilter === id ? "bg-[var(--app-surface)] font-medium shadow-[var(--app-shadow-sm)]" : "text-[var(--app-muted)]")} aria-pressed={memberFilter === id}>{label}</button>
              ))}
            </div>
            {memberFilter === "roles" && !membersLoading ? (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {([ ["owner", "Владельцы"], ["admin", "Админы"], ["member", "Участники"] ] as const).map(([role, label]) => <div key={role} className="rounded-xl border border-[var(--app-border)] p-2"><strong className="block text-base text-[var(--foreground)]">{members?.filter((member) => member.role === role).length ?? 0}</strong><span className="text-[var(--app-muted)]">{label}</span></div>)}
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
            {membersLoading ? <div className="h-32 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : visibleMembers.map((member) => (
              <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--app-surface-soft)]">
                <GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" />
                <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 truncate text-sm font-medium">{member.displayName}{roomParticipantIds.has(member.id) ? <Radio className="h-3.5 w-3.5 shrink-0 text-[var(--theme-accent)]" /> : onlineUserIds.has(member.id) ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" /> : null}</span><span className="block truncate text-xs text-[var(--app-muted)]">@{member.username} · {member.role === "owner" ? "владелец" : member.role === "admin" ? "администратор" : "участник"}</span></span>
              </button>
            ))}
            {!membersLoading && !visibleMembers.length ? <p className="rounded-xl bg-[var(--app-surface-soft)] px-3 py-5 text-center text-sm text-[var(--app-muted)]">{memberFilter === "now" ? "Сейчас в комнате никого нет" : memberFilter === "online" ? "Сейчас никто не в сети" : "Участников пока нет"}</p> : null}
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
