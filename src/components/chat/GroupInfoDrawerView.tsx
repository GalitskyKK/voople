"use client";

import { Check, Hash, Link2, MoreHorizontal, Radio, Settings2, Tag, UserPlus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { RichText } from "@/components/ui/RichText";
import { Sheet } from "@/components/ui/Sheet";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import type { ChatGroupMemberView } from "@/types/chat";

import { GroupAvatar } from "./GroupAvatar";

export type GroupInfoDrawerTab = "info" | "members";
type MemberFilter = "now" | "online" | "all" | "roles";

function getMemberRoom(member: ChatGroupMemberView, legacyRoomParticipantIds: ReadonlySet<string>) {
  if (member.activeRoom) return member.activeRoom;
  return legacyRoomParticipantIds.has(member.id) ? { chatId: "root", name: "Основная комната" } : null;
}

export function GroupInfoDrawerView({ open, tab, chatName, memberCount, groupIcon, groupAvatarUrl, groupBannerUrl, groupAccentColor, groupTag, groupTagEquipped = false, groupTagPending = false, canManage, description, members, onlineUserIds = new Set<string>(), roomParticipantIds = new Set<string>(), infoLoading, membersLoading, error, topics = [], sections = [], roomAction, onOpenChange, onTabChange, onManage, onInvite, onOpenSection, onOpenProfile, onToggleGroupTag }: {
  open: boolean;
  tab: GroupInfoDrawerTab;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupBannerUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
  groupTagEquipped?: boolean;
  groupTagPending?: boolean;
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
  onToggleGroupTag?: () => void;
}) {
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("now");
  const sourceMembers = members ?? [];
  const onlineCount = sourceMembers.filter((member) => onlineUserIds.has(member.id)).length;
  const roomCount = sourceMembers.filter((member) => getMemberRoom(member, roomParticipantIds)).length;
  const headerMembers = useMemo(() => [...sourceMembers].sort((left, right) => {
    const leftRoom = getMemberRoom(left, roomParticipantIds) ? 0 : 1;
    const rightRoom = getMemberRoom(right, roomParticipantIds) ? 0 : 1;
    const leftOnline = onlineUserIds.has(left.id) ? 0 : 1;
    const rightOnline = onlineUserIds.has(right.id) ? 0 : 1;
    return leftRoom - rightRoom || leftOnline - rightOnline;
  }).slice(0, 5), [sourceMembers, onlineUserIds, roomParticipantIds]);
  const headerOverflow = Math.max(0, memberCount - headerMembers.length);
  const visibleMembers = useMemo(() => {
    if (memberFilter === "now") return sourceMembers.filter((member) => getMemberRoom(member, roomParticipantIds));
    if (memberFilter === "online") return sourceMembers.filter((member) => onlineUserIds.has(member.id));
    return sourceMembers;
  }, [memberFilter, sourceMembers, onlineUserIds, roomParticipantIds]);
  const show = (next: GroupInfoDrawerTab) => { onTabChange(next); onOpenChange(true); };

  return (
    <>
      <button type="button" onClick={() => show("info")} className="voople-group-header-identity flex min-w-0 flex-1 items-center gap-5 text-left" aria-label={`Информация о группе ${chatName}`}>
        <span className="voople-group-header-avatar shrink-0"><GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" shape="square" /></span>
        <span className="min-w-0">
          <strong className="voople-group-header-name block truncate">{chatName}</strong>
          <span className="voople-group-header-meta mt-2 flex items-center gap-2 text-[13px] text-[var(--app-muted)]"><span className="voople-group-header-ring" aria-hidden="true" />{memberCount} участников</span>
          <span className="voople-group-header-meta mt-2 flex items-center gap-2 text-[13px] text-[var(--app-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />сейчас в голосе {roomCount} · онлайн {onlineCount}</span>
        </span>
      </button>

      <div className="voople-group-header-actions ml-auto flex shrink-0 items-center gap-2">
        <div className="voople-group-header-members hidden shrink-0 items-center md:flex" aria-label="Участники группы">
          {headerMembers.map((member) => <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="voople-group-header-member" aria-label={member.displayName}><GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" shape="square" /></button>)}
          {headerOverflow > 0 ? <span className="voople-group-header-overflow">+{headerOverflow}</span> : null}
        </div>
        <button type="button" onClick={onInvite} className="voople-group-header-invite hidden h-12 shrink-0 items-center gap-2.5 px-5 text-sm font-semibold sm:inline-flex"><Link2 className="h-3.5 w-3.5" aria-hidden="true" />Пригласить</button>
        <IconButton label="Информация о группе" tooltipSide="bottom" onClick={() => show("info")} className="voople-group-header-more inline-flex h-12 w-12 shrink-0 items-center justify-center"><MoreHorizontal className="h-5 w-5" /></IconButton>
      </div>

      <Sheet open={open} onClose={() => onOpenChange(false)} placement="right" ariaLabel={`Информация о группе ${chatName}`}>
        <div className="-mx-5 -mt-5">
          <div className="h-36 bg-[var(--app-accent-soft)] bg-cover bg-center" style={groupBannerUrl ? { backgroundImage: `url("${groupBannerUrl}")` } : undefined} />
          <div className="px-5">
            <div className="-mt-9 flex items-end justify-between gap-3"><GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" shape="square" />{canManage ? <button type="button" onClick={onManage} className="mb-1 inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-medium hover:bg-[var(--app-surface-soft)]"><Settings2 className="h-4 w-4" />Настройки</button> : null}</div>
            <h2 className="mt-3 text-xl font-semibold">{chatName}</h2><p className="mt-1 text-sm text-[var(--app-muted)]">{memberCount} участников{groupTag ? ` · ${groupTag}` : ""}</p>
            {groupTag && onToggleGroupTag ? <button type="button" onClick={onToggleGroupTag} disabled={groupTagPending} aria-pressed={groupTagEquipped} className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 text-xs font-semibold"><>{groupTagEquipped ? <Check className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}{groupTagEquipped ? "Тег используется" : "Использовать тег"}</></button> : null}
            {onlineCount || roomCount ? <div className="mt-3 flex flex-wrap gap-2 text-xs">{roomCount ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-[var(--theme-accent)]"><Radio className="h-3.5 w-3.5" />{roomCount} разговаривают</span> : null}{onlineCount ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />{onlineCount} онлайн</span> : null}</div> : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[var(--app-surface-soft)] p-1">{([["info", "О группе"], ["members", "Участники"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => onTabChange(id)} className={cn("rounded-lg px-3 py-2 text-sm transition", tab === id ? "bg-[var(--app-surface)] font-medium shadow-[var(--app-shadow-sm)]" : "text-[var(--app-muted)]")} aria-current={tab === id ? "page" : undefined}>{label}</button>)}</div>
        {error ? <p className="mt-4 text-sm text-red-400" role="alert">{error}</p> : null}
        {!error && tab === "info" ? (
          <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--app-muted)]">
            {infoLoading ? <div className="h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : description ? <RichText text={description} /> : <p>Описание сообщества пока не добавлено.</p>}
            {roomCount ? <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3" aria-label="Активная комната"><div className="flex items-center gap-2 text-[var(--theme-accent)]"><Radio className="h-4 w-4" /><strong>{roomCount} сейчас в голосе</strong></div>{roomAction ? <div className="mt-3">{roomAction}</div> : null}</section> : null}
            {topics.length ? <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Темы</h3><div className="mt-2 flex flex-wrap gap-1.5">{topics.map((topic) => <span key={topic} className="rounded-full bg-[var(--app-surface-soft)] px-2.5 py-1 text-xs text-[var(--foreground)]">{topic}</span>)}</div></section> : null}
            {sections.length ? <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Разделы</h3><div className="mt-2 space-y-1">{sections.map((section) => <button key={section.id} type="button" onClick={() => onOpenSection(section.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[var(--foreground)] hover:bg-[var(--app-surface-soft)]"><Hash className="h-3.5 w-3.5 text-[var(--theme-accent)]" /><span className="truncate">{section.name}</span></button>)}</div></section> : null}
            <div className="border-t border-[var(--app-border)] pt-4"><button type="button" onClick={onInvite} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-accent)] px-3 text-sm font-semibold text-slate-950"><UserPlus className="h-4 w-4" />Пригласить</button></div>
          </div>
        ) : !error ? (
          <div className="mt-4"><div className="voople-scroll flex gap-1 overflow-x-auto rounded-xl bg-[var(--app-surface-soft)] p-1" aria-label="Фильтр участников">{([["now", "Сейчас"], ["online", "Онлайн"], ["all", "Все"], ["roles", "Роли"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setMemberFilter(id)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs transition", memberFilter === id ? "bg-[var(--app-surface)] font-medium shadow-[var(--app-shadow-sm)]" : "text-[var(--app-muted)]")} aria-pressed={memberFilter === id}>{label}</button>)}</div><div className="mt-3 space-y-2">{membersLoading ? <div className="h-32 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : visibleMembers.map((member) => { const activeRoom = getMemberRoom(member, roomParticipantIds); return <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--app-surface-soft)]"><GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" shape="square" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{member.displayName}</span><span className="block truncate text-xs text-[var(--app-muted)]">@{member.username}</span>{activeRoom ? <span className="mt-0.5 block truncate text-xs text-[var(--theme-accent)]">Сейчас · {activeRoom.name}</span> : null}</span></button>; })}</div></div>
        ) : null}
      </Sheet>
    </>
  );
}
