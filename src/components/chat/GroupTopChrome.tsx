"use client";

import { Info, Settings2, UserPlus } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";

export function GroupTopChrome({ name, canManage, onOpenInfo, onManage, onInvite }: {
  name: string;
  canManage: boolean;
  onOpenInfo: () => void;
  onManage: () => void;
  onInvite: () => void;
}) {
  return <div className="voople-group-top-chrome" aria-label={`Группа ${name}`}>
    <button type="button" className="voople-group-top-chrome__name" onClick={onOpenInfo} title={name}>{name}</button>
    {canManage ? <IconButton label="Пригласить в группу" tooltipSide="bottom" onClick={onInvite} className="voople-group-top-chrome__action"><UserPlus className="h-4 w-4" /></IconButton> : null}
    <IconButton label="Информация о группе" tooltipSide="bottom" onClick={onOpenInfo} className="voople-group-top-chrome__action"><Info className="h-4 w-4" /></IconButton>
    {canManage ? <IconButton label="Настройки группы" tooltipSide="bottom" onClick={onManage} className="voople-group-top-chrome__action"><Settings2 className="h-4 w-4" /></IconButton> : null}
  </div>;
}
