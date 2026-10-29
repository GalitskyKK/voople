"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import type { GroupNowRoom } from "@/types/group-now";

/** The same avatar/participant nodes move from the cover perimeter into readable rows. */
export function RoomRosterDisclosure({ orbit, room, children, expanded, onPreview, status }: {
  orbit: boolean; room: GroupNowRoom; children: ReactNode; expanded: boolean; onPreview: () => void; status?: ReactNode;
}) {
  const id = useId();
  if (!orbit) return children;
  return <div className="voople-orbit-roster" data-expanded={expanded}
    style={{ "--roster-height": `min(calc(${room.participants.length} * var(--orbit-roster-step)), 240px)`, "--preview-width": `${Math.max(0, (Math.min(room.participants.length, 4) + (room.participants.length > 4 ? 1 : 0) - 1) * 14 + 18)}px` } as CSSProperties}>
    <div className="voople-orbit-room__actions">
    <button type="button" className="voople-orbit-roster__toggle" aria-expanded={expanded} aria-controls={id}
      aria-label={`Подробнее о комнате ${room.name}`} onClick={onPreview}>
      {room.participantCount > 4 ? <span className="voople-orbit-roster__more" aria-hidden="true">+{room.participantCount - 4}</span> : null}
    </button>
    </div>
    {status ? <div className="voople-orbit-room__move-status">{status}</div> : null}
    <div id={id} className="voople-orbit-roster__list voople-scroll" inert={!expanded}>{children}</div>
  </div>;
}
