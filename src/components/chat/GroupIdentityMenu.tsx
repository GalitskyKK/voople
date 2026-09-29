"use client";

import { Check, Settings2, Tag, UserPlus } from "lucide-react";
import { useRef } from "react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { RichText } from "@/components/ui/RichText";

import { GroupIdentityCard } from "./GroupIdentityCard";

export function GroupIdentityMenu({ open, name, memberCount, onlineCount, roomCount, icon, avatarUrl, bannerUrl, accentColor, tag, tagEquipped, tagPending, canManage, description, infoLoading, error, onOpenChange, onInvite, onManage, onToggleTag }: {
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
  infoLoading?: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onInvite: () => void;
  onManage: () => void;
  onToggleTag?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeAndRun = (action: () => void, restoreFocus = false) => {
    onOpenChange(false);
    action();
    if (restoreFocus) requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    });
  };

  return <DropdownMenu open={open} onOpenChange={onOpenChange} align="start" side="bottom" contentRole="dialog"
    ariaLabel={`Действия группы ${name}`} className="w-full" menuClassName="voople-group-identity-popover"
    trigger={<GroupIdentityCard name={name} memberCount={memberCount} onlineCount={onlineCount} roomCount={roomCount}
      icon={icon} avatarUrl={avatarUrl} bannerUrl={bannerUrl} accentColor={accentColor} tag={tag} open={open} triggerRef={triggerRef} />}>
    {error ? <p className="voople-group-identity-popover__error" role="alert">{error}</p> : null}
    {infoLoading ? <div className="voople-group-identity-popover__loading" aria-label="Загружаем информацию о группе" />
      : description ? <div className="voople-group-identity-popover__description"><RichText text={description} /></div>
        : <p className="voople-group-identity-popover__description voople-group-identity-popover__description--empty">Описание группы пока не добавлено.</p>}
    <div className="voople-group-identity-popover__actions">
      {tag && onToggleTag ? <button type="button" data-dropdown-autofocus={!tagPending ? true : undefined} onClick={onToggleTag} disabled={tagPending} aria-pressed={tagEquipped} className="voople-group-identity-popover__action">{tagEquipped ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}{tagEquipped ? "Тег используется" : "Использовать тег"}</button> : null}
      {canManage ? <button type="button" data-dropdown-autofocus={!tag || !onToggleTag || tagPending ? true : undefined} onClick={() => closeAndRun(onInvite, true)} className="voople-group-identity-popover__action"><UserPlus className="h-4 w-4" />Пригласить</button> : null}
      {canManage ? <button type="button" onClick={() => closeAndRun(onManage)} className="voople-group-identity-popover__action"><Settings2 className="h-4 w-4" />Настройки</button> : null}
    </div>
  </DropdownMenu>;
}
