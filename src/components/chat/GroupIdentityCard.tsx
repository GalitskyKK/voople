"use client";

import { ChevronDown } from "lucide-react";
import type { MouseEventHandler, RefObject } from "react";

import { GroupAvatar } from "./GroupAvatar";

export function GroupIdentityCard({ name, memberCount, onlineCount, roomCount, icon, avatarUrl, bannerUrl, accentColor, tag, open, onClick, triggerRef }: {
  name: string;
  memberCount: number;
  onlineCount: number;
  roomCount: number;
  icon: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  accentColor: string | null;
  tag: string | null;
  open: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  return <button ref={triggerRef} type="button" onClick={onClick} className="voople-group-header-identity" aria-label={`Информация о группе ${name}`} aria-haspopup="dialog" aria-expanded={open}>
    <span className="voople-group-pane-banner" style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined} aria-hidden="true">{bannerUrl ? null : <span className="voople-group-pane-banner__fallback">{icon || name.charAt(0)}</span>}</span>
    <span className="voople-group-identity-card__summary">
      <span className="voople-group-header-avatar shrink-0"><GroupAvatar name={name} avatarUrl={avatarUrl} icon={icon} accentColor={accentColor} size="lg" shape="square" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1"><strong className="voople-group-header-name block min-w-0 truncate">{name}</strong>{tag ? <span className="voople-group-header-tag shrink-0">{tag}</span> : null}</span>
        <span className="voople-group-header-meta block">{memberCount} участников · {onlineCount} онлайн · {roomCount} в голосе</span>
      </span>
      <ChevronDown className="voople-group-pane-chevron h-4 w-4 shrink-0" aria-hidden="true" />
    </span>
  </button>;
}
