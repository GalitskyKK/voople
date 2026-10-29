"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type RoomFocus = { expandedId: string | null; currentId: string | null; preview: (id: string | null) => void; select: (id: string | null) => void };
const Context = createContext<RoomFocus | null>(null);

/** Presentation selection only; joining and the authoritative current Room stay independent. */
export function OrbitRoomFocus({ currentRoomId, children }: { currentRoomId: string | null; children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const tile = event.target.closest<HTMLElement>("[data-orbit-room-id]");
      const ownerId = event.target.closest<HTMLElement>("[data-focus-owner]")?.dataset.focusOwner;
      const owner = ownerId ? document.getElementById(ownerId)?.closest<HTMLElement>("[data-orbit-room-id]") : null;
      if (tile?.dataset.orbitRoomId === selectedId || owner?.dataset.orbitRoomId === selectedId) return;
      setSelectedId(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [selectedId]);
  return <Context.Provider value={{ expandedId: hoveredId ?? selectedId, currentId: currentRoomId, preview: setHoveredId, select: setSelectedId }}>{children}</Context.Provider>;
}

export function useOrbitRoomFocus() { return useContext(Context); }
