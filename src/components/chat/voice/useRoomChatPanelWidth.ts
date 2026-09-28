"use client";

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  clampRoomChatPanelWidth,
  ROOM_CHAT_PANEL_DEFAULT_WIDTH,
  ROOM_CHAT_PANEL_MAX_WIDTH,
  ROOM_CHAT_PANEL_MIN_WIDTH,
} from "./room-chat-panel-width";

const STORAGE_KEY = "voople:room-chat-panel-width";

function readStoredWidth() {
  if (typeof window === "undefined") return ROOM_CHAT_PANEL_DEFAULT_WIDTH;
  try {
    const stored = Number.parseInt(window.localStorage.getItem(STORAGE_KEY) ?? "", 10);
    return Number.isFinite(stored)
      ? clampRoomChatPanelWidth(stored)
      : ROOM_CHAT_PANEL_DEFAULT_WIDTH;
  } catch {
    return ROOM_CHAT_PANEL_DEFAULT_WIDTH;
  }
}

export function useRoomChatPanelWidth() {
  const [width, setWidth] = useState(readStoredWidth);
  const widthRef = useRef(width);
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  const updateWidth = useCallback((next: number) => {
    const clamped = clampRoomChatPanelWidth(next);
    widthRef.current = clamped;
    setWidth(clamped);
  }, []);

  const persist = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    } catch {
      // Device-local preference remains in memory when storage is unavailable.
    }
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: widthRef.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    updateWidth(drag.startWidth - (event.clientX - drag.startX));
  }, [updateWidth]);

  const onPointerEnd = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    persist();
  }, [persist]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = event.shiftKey ? 32 : 8;
    if (event.key === "ArrowLeft") updateWidth(widthRef.current + delta);
    else if (event.key === "ArrowRight") updateWidth(widthRef.current - delta);
    else if (event.key === "Home") updateWidth(ROOM_CHAT_PANEL_MIN_WIDTH);
    else if (event.key === "End") updateWidth(ROOM_CHAT_PANEL_MAX_WIDTH);
    else return;
    event.preventDefault();
    persist();
  }, [persist, updateWidth]);

  return { width, onKeyDown, onPointerDown, onPointerMove, onPointerEnd };
}
