"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  resizeVoiceDockRect,
  type VoiceDockResizeDirection,
  type VoiceDockRect,
} from "@/lib/livekit/voice-dock-geometry";

const STORAGE_KEY = "voople:voice-dock-geometry:v2";
const MIN_WIDTH = 360;
const MIN_HEIGHT = 224;
const MAX_WIDTH = 720;
const MAX_HEIGHT = 640;
const VIEWPORT_GAP = 8;
const DRAG_THRESHOLD = 4;

type DockGeometry = {
  width: number;
  height: number | null;
  offsetX: number;
  offsetY: number;
};

type Gesture = {
  mode: "move" | VoiceDockResizeDirection;
  pointerId: number;
  startX: number;
  startY: number;
  origin: DockGeometry;
  rect: DOMRect;
};

const DEFAULT_GEOMETRY: DockGeometry = {
  width: 384,
  height: null,
  offsetX: 0,
  offsetY: 0,
};

function loadGeometry(): DockGeometry {
  if (typeof window === "undefined") return DEFAULT_GEOMETRY;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<DockGeometry> | null;
    if (!stored) return DEFAULT_GEOMETRY;
    return {
      width: Number.isFinite(stored.width) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored.width ?? 384)) : 384,
      height: Number.isFinite(stored.height) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, stored.height ?? MIN_HEIGHT)) : null,
      offsetX: Number.isFinite(stored.offsetX) ? stored.offsetX ?? 0 : 0,
      offsetY: Number.isFinite(stored.offsetY) ? stored.offsetY ?? 0 : 0,
    };
  } catch {
    return DEFAULT_GEOMETRY;
  }
}

function geometryForRect(rect: VoiceDockRect, sourceRect: DOMRect, origin: DockGeometry): DockGeometry {
  const baseLeft = sourceRect.left - origin.offsetX + (sourceRect.width - rect.width) / 2;
  const baseTop = sourceRect.top - origin.offsetY + sourceRect.height - rect.height;
  return {
    width: rect.width,
    height: rect.height,
    offsetX: rect.left - baseLeft,
    offsetY: rect.top - baseTop,
  };
}

export function useVoiceDockGeometry(dockRef: RefObject<HTMLDivElement | null>) {
  const gestureRef = useRef<Gesture | null>(null);
  const draggedRef = useRef(false);
  const [geometry, setGeometry] = useState(loadGeometry);
  const [gestureActive, setGestureActive] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(geometry));
    } catch {
      // A blocked storage backend should not break active call controls.
    }
  }, [geometry]);

  useEffect(() => {
    const keepInsideViewport = () => {
      const dock = dockRef.current;
      if (!dock) return;
      const rect = dock.getBoundingClientRect();
      const width = Math.min(rect.width, Math.max(1, window.innerWidth - VIEWPORT_GAP * 2));
      const height = Math.min(rect.height, Math.max(1, window.innerHeight - VIEWPORT_GAP * 2));
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_GAP),
        window.innerWidth - VIEWPORT_GAP - width,
      );
      const top = Math.min(
        Math.max(rect.top, VIEWPORT_GAP),
        window.innerHeight - VIEWPORT_GAP - height,
      );
      if (
        Math.abs(left - rect.left) < 0.5 &&
        Math.abs(top - rect.top) < 0.5 &&
        Math.abs(width - rect.width) < 0.5 &&
        Math.abs(height - rect.height) < 0.5
      ) return;
      setGeometry(geometryForRect({ left, top, width, height }, rect, geometry));
    };

    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, [dockRef, geometry]);

  const startGesture = (
    mode: Gesture["mode"],
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const dock = dockRef.current;
    if (!dock) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggedRef.current = false;
    setGestureActive(true);
    gestureRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: geometry,
      rect: dock.getBoundingClientRect(),
    };
  };

  const updateGesture = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) draggedRef.current = true;

    if (gesture.mode !== "move") {
      setGeometry(geometryForRect(
        resizeVoiceDockRect({
          rect: {
            left: gesture.rect.left,
            top: gesture.rect.top,
            width: gesture.rect.width,
            height: gesture.rect.height,
          },
          direction: gesture.mode,
          deltaX: dx,
          deltaY: dy,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          gap: VIEWPORT_GAP,
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
          maxWidth: MAX_WIDTH,
          maxHeight: MAX_HEIGHT,
        }),
        gesture.rect,
        gesture.origin,
      ));
      return;
    }

    setGeometry((current) => ({
      ...current,
      offsetX: Math.min(
        Math.max(gesture.origin.offsetX + dx, VIEWPORT_GAP - gesture.rect.left + gesture.origin.offsetX),
        window.innerWidth - VIEWPORT_GAP - gesture.rect.right + gesture.origin.offsetX,
      ),
      offsetY: Math.min(
        Math.max(gesture.origin.offsetY + dy, VIEWPORT_GAP - gesture.rect.top + gesture.origin.offsetY),
        window.innerHeight - VIEWPORT_GAP - gesture.rect.bottom + gesture.origin.offsetY,
      ),
    }));
  };

  const endGesture = (event: ReactPointerEvent<HTMLElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) {
      gestureRef.current = null;
      setGestureActive(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resizeWithKeyboard = (
    direction: VoiceDockResizeDirection,
    event: ReactKeyboardEvent<HTMLElement>,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const dock = dockRef.current;
    if (!dock) return;
    const step = event.shiftKey ? 24 : 8;
    const rect = dock.getBoundingClientRect();
    setGeometry(geometryForRect(
      resizeVoiceDockRect({
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        direction,
        deltaX: event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
        deltaY: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        gap: VIEWPORT_GAP,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        maxWidth: MAX_WIDTH,
        maxHeight: MAX_HEIGHT,
      }),
      rect,
      geometry,
    ));
  };

  const captureClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!draggedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  const cancelGesture = () => {
    gestureRef.current = null;
    setGestureActive(false);
  };

  const style: CSSProperties = {
    width: `min(${geometry.width}px, calc(100vw - 1rem))`,
    height: geometry.height ? `min(${geometry.height}px, calc(100dvh - 1rem))` : undefined,
    translate: `${geometry.offsetX}px ${geometry.offsetY}px`,
  };

  return {
    style,
    gestureActive,
    resetPosition: () => setGeometry((current) => ({ ...current, offsetX: 0, offsetY: 0 })),
    startMove: (event: ReactPointerEvent<HTMLElement>) => startGesture("move", event),
    startResize: (direction: VoiceDockResizeDirection, event: ReactPointerEvent<HTMLElement>) => startGesture(direction, event),
    resizeWithKeyboard,
    updateGesture,
    endGesture,
    cancelGesture,
    captureClick,
  };
}
