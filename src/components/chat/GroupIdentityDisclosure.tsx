"use client";

import { Check, ChevronDown, Settings2, Tag, UserPlus, UsersRound } from "lucide-react";
import { useId } from "react";

import { RichText } from "@/components/ui/RichText";
import type { ChatGroupMemberView } from "@/types/chat";
import { GroupAvatar } from "./GroupAvatar";

export function GroupIdentityDisclosure({ open, name, memberCount, onlineCount, roomCount, icon, avatarUrl, bannerUrl, accentColor, tag, tagEquipped, tagPending, canManage, description, members, infoLoading, membersLoading, error, onOpenChange, onInvite, onOpenPeople, onManage, onOpenProfile, onToggleTag }: {
  open: boolean;
  name: string;
  memberCount: number;
  onlineCount: number;
  roomCount: number;
  icon: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  accentColor: string | null;
  tag: string | null;
  tagEquipped: boolean;
  tagPending: boolean;
  canManage: boolean;
  description?: string | null;
  members?: ChatGroupMemberView[];
  infoLoading?: boolean;
  membersLoading?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onInvite: () => void;
  onOpenPeople: () => void;
  onManage: () => void;
  onOpenProfile: (username: string) => void;
  onToggleTag?: () => void;
}) {
  const detailsId = useId();
  return <div className="voople-group-identity-disclosure">
    <button type="button" className="voople-group-header-identity" aria-label={`Информация о группе ${name}`}
      aria-expanded={open} aria-controls={detailsId} onClick={() => onOpenChange(!open)}>
      <span className="voople-group-pane-banner" style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined} aria-hidden="true">{bannerUrl ? null : <span className="voople-group-pane-banner__fallback">{icon || name.charAt(0)}</span>}</span>
      <span className="voople-group-identity-disclosure__summary">
        <span className="voople-group-header-avatar shrink-0"><GroupAvatar name={name} avatarUrl={avatarUrl} icon={icon} accentColor={accentColor} size="lg" shape="square" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1"><strong className="voople-group-header-name block min-w-0 truncate">{name}</strong>{tag ? <span className="voople-group-header-tag shrink-0">{tag}</span> : null}</span>
          <span className="voople-group-header-meta block">{memberCount} участников · {onlineCount} онлайн · {roomCount} в голосе</span>
        </span>
        <ChevronDown className="voople-group-pane-chevron h-4 w-4 shrink-0" aria-hidden="true" />
      </span>
    </button>
    <div id={detailsId} className="voople-group-identity-disclosure__details" hidden={!open}>
      {error ? <p className="text-xs text-red-400" role="alert">{error}</p> : null}
      {infoLoading ? <div className="h-10 animate-pulse rounded-lg bg-[var(--material-raised-fill)]" aria-label="Загружаем информацию о группе" />
        : description ? <div className="voople-group-identity-disclosure__description"><RichText text={description} /></div>
          : <p className="text-[var(--app-muted)]">Описание группы пока не добавлено.</p>}
      <p className="voople-group-identity-disclosure__counts">{memberCount} участников · {onlineCount} онлайн · {roomCount} в голосе</p>
      {membersLoading ? <div className="h-8 w-24 animate-pulse rounded-lg bg-[var(--material-raised-fill)]" aria-label="Загружаем участников" /> : members?.length ? <div className="flex -space-x-1.5" aria-label="Участники группы">{members.slice(0, 5).map((member) => <button key={member.id} type="button" onClick={() => onOpenProfile(member.username)} className="rounded-lg focus-visible:outline-2 focus-visible:outline-[var(--material-focus-ring)]" aria-label={`Профиль ${member.displayName}`}><GroupAvatar name={member.displayName} avatarUrl={member.avatarUrl ?? null} icon={null} accentColor={member.roleColor} size="sm" shape="square" /></button>)}</div> : null}
      {tag && onToggleTag ? <button type="button" onClick={onToggleTag} disabled={tagPending} aria-pressed={tagEquipped} className="voople-group-identity-disclosure__action">{tagEquipped ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}{tagEquipped ? "Тег используется" : "Использовать тег"}</button> : null}
      <div className="voople-group-identity-disclosure__actions">
        {canManage ? <button type="button" onClick={onInvite} className="voople-group-identity-disclosure__action"><UserPlus className="h-4 w-4" />Пригласить</button> : null}
        <button type="button" onClick={onOpenPeople} className="voople-group-identity-disclosure__action"><UsersRound className="h-4 w-4" />Люди</button>
        {canManage ? <button type="button" onClick={onManage} className="voople-group-identity-disclosure__action"><Settings2 className="h-4 w-4" />Настройки</button> : null}
      </div>
    </div>
  </div>;
}
