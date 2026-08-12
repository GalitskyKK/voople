"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

const STORAGE_KEY = "voople:voice-dock-width:v1";
const MIN_WIDTH = 360;
const MAX_WIDTH = 560;
const VIEWPORT_GAP = 8;

type Gesture = {
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originWidth: number;
  rect: DOMRect;
};

function loadWidth() {
  if (typeof window === "undefined") return 384;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored)) : 384;
}

export function useVoiceDockGeometry(dockRef: RefObject<HTMLDivElement | null>) {
  const gestureRef = useRef<Gesture | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(loadWidth);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  const startGesture = (
    mode: Gesture["mode"],
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const dock = dockRef.current;
    if (!dock) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      originWidth: width,
      rect: dock.getBoundingClientRect(),
    };
  };

  const updateGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (gesture.mode === "resize") {
      const viewportMax = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
      const nextWidth = Math.min(
        MAX_WIDTH,
        viewportMax,
        Math.max(MIN_WIDTH, gesture.originWidth + dx * 2),
      );
      const halfGrowth = (nextWidth - gesture.originWidth) / 2;
      const projectedLeft = gesture.rect.left - halfGrowth;
      const projectedRight = gesture.rect.right + halfGrowth;
      const lowerCorrection = VIEWPORT_GAP - projectedLeft;
      const upperCorrection = window.innerWidth - VIEWPORT_GAP - projectedRight;
      const correction = Math.min(Math.max(0, lowerCorrection), upperCorrection);
      setOffset({ x: gesture.originX + correction, y: gesture.originY });
      setWidth(nextWidth);
      return;
    }

    setOffset({
      x: Math.min(
        Math.max(gesture.originX + dx, VIEWPORT_GAP - gesture.rect.left + gesture.originX),
        window.innerWidth - VIEWPORT_GAP - gesture.rect.right + gesture.originX,
      ),
      y: Math.min(
        Math.max(gesture.originY + dy, VIEWPORT_GAP - gesture.rect.top + gesture.originY),
        window.innerHeight - VIEWPORT_GAP - gesture.rect.bottom + gesture.originY,
      ),
    });
  };

  const endGesture = (event: ReactPointerEvent<HTMLElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return {
    style: {
      width: `min(${width}px, calc(100vw - 1rem))`,
      translate: `${offset.x}px ${offset.y}px`,
    },
    resetPosition: () => setOffset({ x: 0, y: 0 }),
    startMove: (event: ReactPointerEvent<HTMLElement>) => startGesture("move", event),
    startResize: (event: ReactPointerEvent<HTMLElement>) => startGesture("resize", event),
    updateGesture,
    endGesture,
    cancelGesture: () => { gestureRef.current = null; },
  };
}
