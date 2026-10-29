"use client";

import { useState } from "react";
import { GitFork, ImagePlus, LogIn, Maximize2, Settings } from "lucide-react";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { GroupNowRoom } from "@/types/group-now";
import { useOrbitRoomFocus } from "./OrbitRoomFocus";

export function OrbitRoomMenu({ room, ownerId, current, pending, splitPending, onEnter, onSplit, onEdit }: {
  room: GroupNowRoom; ownerId: string; current: boolean; pending: boolean; splitPending?: boolean;
  onEnter: () => void; onSplit?: () => void; onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const focus = useOrbitRoomFocus();
  const action = (callback: () => void) => { setOpen(false); callback(); };
  const item = "voople-orbit-room-menu__item";
  return <DropdownMenu open={open} onOpenChange={value => { setOpen(value); if (value) focus?.select(room.id); }}
    focusOwnerId={ownerId} side="right" minWidth={168} className="voople-orbit-room__menu" menuClassName="voople-orbit-room-menu" ariaLabel={`Действия комнаты ${room.name}`}
    trigger={<button id={ownerId} type="button" className="voople-orbit-room__gear" aria-label={`Действия комнаты ${room.name}`} aria-expanded={open} aria-haspopup="menu"><Settings className="h-3.5 w-3.5" aria-hidden="true" /></button>}>
    <button type="button" role="menuitem" className={item} disabled={pending} onClick={() => action(onEnter)}>{current ? <Maximize2 className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{current ? "Открыть разговор" : "Войти"}</button>
    {onSplit ? <button type="button" role="menuitem" className={item} disabled={pending || splitPending} onClick={() => action(onSplit)}><GitFork className="h-4 w-4" aria-hidden="true" />Отделиться во временную комнату</button> : null}
    {room.canManage && room.joinTarget.kind === "room" ? <button type="button" role="menuitem" className={item} onClick={() => action(onEdit)}><ImagePlus className="h-4 w-4" aria-hidden="true" />Обложка</button> : null}
  </DropdownMenu>;
}
