"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const HORIZONTAL_LOCK_PX = 10;
const REPLY_TRIGGER_PX = 52;
const MAX_OFFSET_PX = 68;

type SwipeOrigin = {
  pointerId: number;
  x: number;
  y: number;
  horizontal: boolean;
};

export function useSwipeToReply({
  enabled,
  onReply,
}: {
  enabled: boolean;
  onReply: () => void;
}) {
  const originRef = useRef<SwipeOrigin | null>(null);
  const offsetRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [offset, setOffsetState] = useState(0);
  const [dragging, setDragging] = useState(false);

  const setOffset = useCallback((next: number) => {
    offsetRef.current = next;
    setOffsetState(next);
  }, []);

  const reset = useCallback(() => {
    originRef.current = null;
    setDragging(false);
    setOffset(0);
  }, [setOffset]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType !== "touch") return;
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,textarea,select,audio,video")) return;

    originRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      horizontal: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [enabled]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - origin.x;
    const deltaY = event.clientY - origin.y;
    if (!origin.horizontal) {
      if (Math.abs(deltaY) > HORIZONTAL_LOCK_PX && Math.abs(deltaY) >= Math.abs(deltaX)) {
        reset();
        return;
      }
      if (deltaX < HORIZONTAL_LOCK_PX || deltaX <= Math.abs(deltaY) * 1.2) return;
      origin.horizontal = true;
      setDragging(true);
    }

    setOffset(Math.min(MAX_OFFSET_PX, Math.max(0, deltaX)));
  }, [reset, setOffset]);

  const finish = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    const shouldReply = origin.horizontal && offsetRef.current >= REPLY_TRIGGER_PX;
    suppressClickRef.current = origin.horizontal;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    reset();
    if (shouldReply) onReply();
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 400);
  }, [onReply, reset]);

  const cancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (originRef.current?.pointerId !== event.pointerId) return;
    suppressClickRef.current = false;
    reset();
  }, [reset]);

  const consumeClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    offset,
    dragging,
    consumeClick,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: cancel,
    },
  };
}
