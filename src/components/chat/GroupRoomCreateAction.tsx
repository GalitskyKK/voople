"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/IconButton";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
import { useGroupRoomActionSlot } from "./GroupRoomActionSlotContext";

/** One creation action, placed in existing Group chrome in Orbit. */
export function GroupRoomCreateAction({ pending, onCreate }: { pending?: boolean; onCreate: () => void }) {
  const orbit = useInterfaceDesign() === "orbit";
  const slot = useGroupRoomActionSlot();
  const action = <IconButton className="voople-group-now__create" tooltipSide="left"
    label={pending ? "Создаём комнату" : "Создать постоянную комнату"}
    aria-busy={pending || undefined} disabled={pending} onClick={onCreate}>
    {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
    <span className="voople-group-now__create-label">{pending ? "Создаём…" : "Комната"}</span>
  </IconButton>;
  return orbit ? slot ? createPortal(action, slot) : null : action;
}
