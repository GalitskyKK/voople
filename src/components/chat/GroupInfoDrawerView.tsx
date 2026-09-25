"use client";

import { Check, MoreHorizontal, Radio, Settings2, Tag, UserPlus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { RichText } from "@/components/ui/RichText";
import { Sheet } from "@/components/ui/Sheet";
import type { ChatGroupMemberView } from "@/types/chat";
import type { GroupNowView } from "@/types/group-now";

import { GroupAvatar } from "./GroupAvatar";
import { useGroupSurfaceNavigation } from "./GroupSurfaceNavigationContext";

export function GroupInfoDrawerView({ open, chatName, memberCount, groupIcon, groupAvatarUrl, groupBannerUrl, groupAccentColor, groupTag, groupTagEquipped = false, groupTagPending = false, canManage, description, members, now, infoLoading, membersLoading, error, roomAction, onOpenChange, onManage, onInvite, onOpenPeople, onOpenProfile, onToggleGroupTag }: {
  open: boolean;
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
  now?: GroupNowView;
  infoLoading?: boolean;
  membersLoading?: boolean;
  error?: string | null;
  roomAction?: ReactNode;
  onOpenChange: (open: boolean) => void;
  onManage: () => void;
  onInvite: () => void;
  onOpenPeople?: () => void;
  onOpenProfile: (username: string) => void;
  onToggleGroupTag?: () => void;
}) {
  const selectGroupTab = useGroupSurfaceNavigation();
  const activeRooms = now?.rooms.filter((room) => (room.state === "active" || room.state === "connecting") && room.participantCount > 0) ?? [];
  const roomCount = activeRooms.reduce((count, room) => count + room.participantCount, 0);
  const onlineCount = now?.visibleOnlineCount ?? 0;
  const activeIds = new Set(activeRooms.flatMap((room) => room.participants.map((person) => person.id)));
  const preview = [...(members ?? [])].sort((left, right) => Number(activeIds.has(right.id)) - Number(activeIds.has(left.id))).slice(0, 5);
  const overflow = Math.max(0, memberCount - preview.length);

  return (
    <>
      <button type="button" onClick={() => onOpenChange(true)} className="voople-group-header-identity flex min-w-0 flex-1 items-center gap-5 text-left" aria-label={`Информация о группе ${chatName}`}>
        <span className="voople-group-header-avatar shrink-0"><GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" shape="square" /></span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2"><strong className="voople-group-header-name block min-w-0 truncate">{chatName}</strong>{groupTag ? <span className="voople-group-header-tag shrink-0">{groupTag}</span> : null}</span>
          <span className="voople-group-header-meta mt-2 flex items-center gap-2 text-[13px] text-[var(--app-muted)]"><span className="voople-group-header-ring" aria-hidden="true" />{memberCount} участников</span>
          <span className="voople-group-header-meta mt-2 flex items-center gap-2 text-[13px] text-[var(--app-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />сейчас в голосе {roomCount} · онлайн {onlineCount}</span>
        </span>
      </button>

      <div className="voople-group-header-actions ml-auto flex shrink-0 items-center gap-2">
        <div className="voople-group-header-members hidden shrink-0 items-center md:flex" aria-label="Участники группы">
          {preview.map((member) => <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="voople-group-header-member" aria-label={member.displayName}><GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" shape="square" /></button>)}
          {overflow > 0 ? <span className="voople-group-header-overflow">+{overflow}</span> : null}
        </div>
        {canManage ? <button type="button" onClick={onInvite} className="voople-group-header-invite hidden h-12 shrink-0 items-center gap-2.5 px-5 text-sm font-semibold sm:inline-flex"><UserPlus className="h-3.5 w-3.5" aria-hidden="true" />Пригласить</button> : null}
        {canManage ? <IconButton label="Пригласить в группу" tooltipSide="bottom" onClick={onInvite} className="voople-group-header-more inline-flex h-12 w-12 shrink-0 items-center justify-center sm:hidden"><UserPlus className="h-5 w-5" /></IconButton> : null}
        <IconButton label={canManage ? "Настройки группы" : "Информация о группе"} tooltipSide="bottom" onClick={canManage ? onManage : () => onOpenChange(true)} className="voople-group-header-more inline-flex h-12 w-12 shrink-0 items-center justify-center">{canManage ? <Settings2 className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}</IconButton>
      </div>

      <Sheet open={open} onClose={() => onOpenChange(false)} placement="right" ariaLabel={`Информация о группе ${chatName}`}>
        <div className="-mx-5 -mt-5">
          <div className="h-32 bg-[var(--material-raised-fill)] bg-cover bg-center" style={groupBannerUrl ? { backgroundImage: `url("${groupBannerUrl}")` } : undefined} />
          <div className="px-5">
            <div className="-mt-9 flex items-end justify-between gap-3"><GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" shape="square" />{canManage ? <button type="button" onClick={onManage} className="voople-material-control mb-1 inline-flex min-h-10 items-center gap-2 px-3 text-xs font-medium"><Settings2 className="h-4 w-4" />Настройки</button> : null}</div>
            <h2 className="mt-3 text-xl font-semibold">{chatName}</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">{memberCount} участников{groupTag ? ` · ${groupTag}` : ""}</p>
            {groupTag && onToggleGroupTag ? <button type="button" onClick={onToggleGroupTag} disabled={groupTagPending} aria-pressed={groupTagEquipped} className="voople-material-control mt-3 inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold">{groupTagEquipped ? <Check className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}{groupTagEquipped ? "Тег используется" : "Использовать тег"}</button> : null}
          </div>
        </div>

        {error ? <p className="mt-5 text-sm text-red-400" role="alert">{error}</p> : null}
        <div className="mt-5 space-y-5 text-sm">
          {infoLoading ? <div className="h-16 animate-pulse rounded-xl bg-[var(--material-raised-fill)]" /> : description ? <RichText text={description} /> : <p className="text-[var(--app-muted)]">Описание группы пока не добавлено.</p>}
          <p className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--app-muted)]"><span>{onlineCount} онлайн</span><span>{roomCount} в голосе</span></p>
          {activeRooms.length ? <section aria-label="Активные комнаты"><h3 className="text-xs font-semibold text-[var(--foreground)]">Сейчас в голосе</h3><div className="mt-2 flex flex-wrap gap-2">{activeRooms.map((room) => <span key={room.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--material-control-fill)] px-2.5 py-1.5 text-xs"><Radio className="h-3.5 w-3.5 text-[var(--voople-ice)]" aria-hidden="true" />{room.name} · {room.participantCount}</span>)}</div>{roomAction ? <div className="mt-3">{roomAction}</div> : null}</section> : null}
          <section aria-label="Несколько участников"><h3 className="text-xs font-semibold text-[var(--foreground)]">Участники</h3>{membersLoading ? <div className="mt-2 h-10 animate-pulse rounded-xl bg-[var(--material-raised-fill)]" /> : <div className="mt-2 flex -space-x-1.5">{preview.map((member) => <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--material-focus-ring)]" aria-label={member.displayName}><GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" shape="square" /></button>)}</div>}</section>
          <button type="button" onClick={() => { onOpenChange(false); if (onOpenPeople) onOpenPeople(); else selectGroupTab?.("people"); }} className="voople-material-control flex min-h-11 w-full items-center justify-center gap-2 px-3 text-sm font-medium"><UsersRound className="h-4 w-4" />Все люди</button>
          {canManage ? <button type="button" onClick={onInvite} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-accent)] px-3 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" />Пригласить в группу</button> : null}
        </div>
      </Sheet>
    </>
  );
}
