"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
import { layoutOrbitRooms } from "@/lib/chat/orbit-room-layout";
import type { GroupNowRoom } from "@/types/group-now";
import { useOrbitRoomFocus } from "./OrbitRoomFocus";

function ownsPopup(root: HTMLElement, target: EventTarget | null) {
  const ownerId = target instanceof Element ? target.closest<HTMLElement>("[data-focus-owner]")?.dataset.focusOwner : null;
  return Boolean(ownerId && root.contains(document.getElementById(ownerId)));
}

export function OrbitRoomMap({ rooms, renderRoom }: { rooms: GroupNowRoom[]; renderRoom: (room: GroupNowRoom) => ReactNode }) {
  const orbit = useInterfaceDesign() === "orbit";
  const focus = useOrbitRoomFocus();
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: -1, y: -1 });
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = root.current;
    if (!orbit || !element) return;
    const observer = new ResizeObserver(() => {
      setWidth(element.clientWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [orbit]);
  if (!orbit) return <div className="voople-group-now__rooms">{rooms.map(renderRoom)}</div>;
  const expandedId = focus?.expandedId ?? null;
  const mapWidth = width || 300;
  const layout = layoutOrbitRooms(mapWidth, rooms, expandedId, focus?.currentId);
  return <div ref={root} className="voople-orbit-map" data-ready={width > 0} data-expanded={rooms.some(room => room.id === expandedId)}
    style={{ height: layout.height }}
    onPointerMove={(event) => {
      if (event.pointerType !== "mouse" || Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) < 3) return;
      pointer.current = { x: event.clientX, y: event.clientY };
      const tile = (event.target as HTMLElement).closest<HTMLElement>("[data-orbit-room-id]");
      if (tile) focus?.preview(tile.dataset.orbitRoomId!);
    }} onPointerLeave={() => focus?.preview(null)}
    onFocusCapture={(event) => {
      if (!(event.target as HTMLElement).matches(":focus-visible")) return;
      const tile = (event.target as HTMLElement).closest<HTMLElement>("[data-orbit-room-id]");
      if (tile) focus?.select(tile.dataset.orbitRoomId!);
    }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !ownsPopup(event.currentTarget, event.relatedTarget)) focus?.select(null); }}
    onKeyDown={(event) => { if (event.key === "Escape" && event.currentTarget.contains(event.target as Node) && !event.defaultPrevented) { focus?.preview(null); focus?.select(null); } }}>
    {rooms.map((room, index) => {
      const tile = layout.placements[index];
      const rosterWidth = Math.min(mapWidth - 16, Math.max(176, tile.width));
      const rosterLeft = Math.max(8, Math.min(tile.x + tile.width / 2 - rosterWidth / 2, mapWidth - rosterWidth - 8)) - tile.x;
      return <div key={room.id} data-orbit-room-id={room.id} data-expanded={room.id === expandedId} data-current={room.id === focus?.currentId}
        className="voople-orbit-map__tile" style={{ width: tile.width, transform: `translate3d(${tile.x}px, ${tile.y}px, 0)`,
          "--orbit-aura-height": `${tile.width + 32 + Math.min(room.participantCount * 44, 240)}px`,
          "--orbit-aura-left": `${Math.min(112, tile.x)}px`,
          "--orbit-aura-right": `${Math.min(112, Math.max(0, mapWidth - tile.x - tile.width))}px`,
          "--orbit-aura-top": `${Math.min(24, tile.y)}px`,
          "--orbit-roster-width": `${rosterWidth}px`, "--orbit-roster-left": `${rosterLeft}px` } as CSSProperties}>{renderRoom(room)}</div>;
    })}
  </div>;
}
