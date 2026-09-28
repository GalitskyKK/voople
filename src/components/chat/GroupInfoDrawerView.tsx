"use client";

import { Check, ChevronDown, Settings2, Tag, UserPlus, UsersRound } from "lucide-react";
import { createPortal } from "react-dom";

import { RichText } from "@/components/ui/RichText";
import { Sheet } from "@/components/ui/Sheet";
import type { ChatGroupMemberView } from "@/types/chat";
import type { GroupNowView } from "@/types/group-now";

import { GroupAvatar } from "./GroupAvatar";
import { GroupTopChrome } from "./GroupTopChrome";
import { useGroupTopChromeSlot } from "./GroupTopChromeSlotContext";
import { useGroupSurfaceNavigation } from "./GroupSurfaceNavigationContext";
import { useGroupIdentitySlot } from "./GroupIdentitySlotContext";

export function GroupInfoDrawerView({ open, chatName, memberCount, groupIcon, groupAvatarUrl, groupBannerUrl, groupAccentColor, groupTag, groupTagEquipped = false, groupTagPending = false, canManage, description, members, now, infoLoading, membersLoading, error, onOpenChange, onManage, onInvite, onOpenPeople, onOpenProfile, onToggleGroupTag }: {
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
  onOpenChange: (open: boolean) => void;
  onManage: () => void;
  onInvite: () => void;
  onOpenPeople?: () => void;
  onOpenProfile: (username: string) => void;
  onToggleGroupTag?: () => void;
}) {
  const selectGroupTab = useGroupSurfaceNavigation();
  const identitySlot = useGroupIdentitySlot();
  const desktopChromeSlot = useGroupTopChromeSlot();
  const activeRooms = now?.rooms.filter((room) => (room.state === "active" || room.state === "connecting") && room.participantCount > 0) ?? [];
  const roomCount = activeRooms.reduce((count, room) => count + room.participantCount, 0);
  const onlineCount = now?.visibleOnlineCount ?? 0;
  const activeIds = new Set(activeRooms.flatMap((room) => room.participants.map((person) => person.id)));
  const preview = [...(members ?? [])].sort((left, right) => Number(activeIds.has(right.id)) - Number(activeIds.has(left.id))).slice(0, 5);

  const identity = (
      <button type="button" onClick={() => onOpenChange(true)} className="voople-group-header-identity flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Информация о группе ${chatName}`}>
        {groupBannerUrl ? <span className="voople-group-pane-banner" style={{ backgroundImage: `url("${groupBannerUrl}")` }} aria-hidden="true" /> : null}
        <span className="voople-group-header-avatar shrink-0"><GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" shape="square" /></span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2"><strong className="voople-group-header-name block min-w-0 truncate">{chatName}</strong>{groupTag ? <span className="voople-group-header-tag shrink-0">{groupTag}</span> : null}</span>
          <span className="voople-group-header-meta mt-1.5 block truncate text-[12px] text-[var(--app-muted)]">{memberCount} участников · {onlineCount} онлайн · {roomCount} в голосе</span>
        </span>
        <ChevronDown className="voople-group-pane-chevron h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
  );

  return (
    <>
      {identitySlot ? createPortal(identity, identitySlot) : identity}
      {desktopChromeSlot
        ? createPortal(<GroupTopChrome name={chatName} canManage={canManage} onOpenInfo={() => onOpenChange(true)} onManage={onManage} onInvite={onInvite} />, desktopChromeSlot)
        : <GroupTopChrome name={chatName} canManage={canManage} onOpenInfo={() => onOpenChange(true)} onManage={onManage} onInvite={onInvite} />}

      <Sheet open={open} onClose={() => onOpenChange(false)} placement="context" ariaLabel={`Информация о группе ${chatName}`}>
        <div className="-mx-5 -mt-5">
          <div className="h-24 bg-[var(--material-raised-fill)] bg-cover bg-center" style={groupBannerUrl ? { backgroundImage: `url("${groupBannerUrl}")` } : undefined} />
          <div className="px-5">
            <div className="-mt-9 flex items-end justify-between gap-3"><GroupAvatar name={chatName} avatarUrl={groupAvatarUrl} icon={groupIcon} accentColor={groupAccentColor} size="lg" shape="square" />{canManage ? <button type="button" onClick={onManage} className="voople-material-control mb-1 inline-flex min-h-10 items-center gap-2 px-3 text-xs font-medium"><Settings2 className="h-4 w-4" />Настройки</button> : null}</div>
            <h2 className="mt-3 text-xl font-semibold">{chatName}</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">{memberCount} участников{groupTag ? ` · ${groupTag}` : ""}</p>
            {groupTag && onToggleGroupTag ? <button type="button" onClick={onToggleGroupTag} disabled={groupTagPending} aria-pressed={groupTagEquipped} className="voople-material-control mt-3 inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold">{groupTagEquipped ? <Check className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}{groupTagEquipped ? "Тег используется" : "Использовать тег"}</button> : null}
          </div>
        </div>

        {error ? <p className="mt-5 text-sm text-red-400" role="alert">{error}</p> : null}
        <div className="mt-4 space-y-4 text-sm">
          {infoLoading ? <div className="h-16 animate-pulse rounded-xl bg-[var(--material-raised-fill)]" /> : description ? <RichText text={description} /> : <p className="text-[var(--app-muted)]">Описание группы пока не добавлено.</p>}
          <p className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--app-muted)]"><span>{onlineCount} онлайн</span><span>{roomCount} в голосе</span></p>
          <section aria-label="Несколько участников"><h3 className="text-xs font-semibold text-[var(--foreground)]">Участники</h3>{membersLoading ? <div className="mt-2 h-10 animate-pulse rounded-xl bg-[var(--material-raised-fill)]" /> : <div className="mt-2 flex -space-x-1.5">{preview.map((member) => <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--material-focus-ring)]" aria-label={member.displayName}><GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" shape="square" /></button>)}</div>}</section>
          <button type="button" onClick={() => { onOpenChange(false); if (onOpenPeople) onOpenPeople(); else selectGroupTab?.("people"); }} className="voople-material-control flex min-h-11 w-full items-center justify-center gap-2 px-3 text-sm font-medium"><UsersRound className="h-4 w-4" />Все люди</button>
          {canManage ? <button type="button" onClick={onInvite} className="voople-material-control flex min-h-11 w-full items-center justify-center gap-2 px-3 text-sm font-semibold"><UserPlus className="h-4 w-4" />Пригласить в группу</button> : null}
        </div>
      </Sheet>
    </>
  );
}
