"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type MouseEvent } from "react";

const SIZE = 64;
const GAP = 12;
type Point = { x: number; y: number };

/** Tile-only movement never changes shell height or the media runtime. */
export function useFloatingVoiceTile() {
  const [point, setPoint] = useState<Point | null>(null);
  const position = useRef<Point | null>(null);
  const gesture = useRef<{ x: number; y: number; origin: Point; dragged: boolean } | null>(null);
  const suppressClick = useRef(false);
  const movedByUser = useRef(false);
  const bounds = useRef({ left: GAP, right: GAP, top: GAP, bottom: GAP });
  const move = useCallback((next: Point) => {
    const limits = bounds.current;
    const clamped = { x: Math.max(limits.left, Math.min(limits.right, next.x)), y: Math.max(limits.top, Math.min(limits.bottom, next.y)) };
    position.current = clamped;
    setPoint(previous => previous?.x === clamped.x && previous.y === clamped.y ? previous : clamped);
  }, []);
  useEffect(() => {
    const update = () => {
      const header = document.querySelector(".voople-group-surface-header, .voople-direct-workspace__header, .voople-chat-window > .voople-panel-header, .voople-topbar");
      const composer = document.querySelector(".voople-chat-composer__surface");
      const navigation = document.querySelector(".voople-bottom-nav");
      const viewport = window.visualViewport;
      const top = (header?.getBoundingClientRect().bottom ?? 64) + GAP;
      const viewportBottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
      const bottom = Math.min(viewportBottom, composer?.getBoundingClientRect().top ?? viewportBottom, navigation?.getBoundingClientRect().top ?? viewportBottom) - SIZE - GAP;
      bounds.current = { left: GAP, right: Math.max(GAP, (viewport?.width ?? window.innerWidth) - SIZE - GAP), top, bottom: Math.max(top, bottom) };
      const resting = { x: document.querySelector(".voople-group-workspace__live") ? GAP : bounds.current.right, y: top };
      move(movedByUser.current ? position.current ?? resting : resting);
    };
    const observer = new ResizeObserver(update);
    const observed = new Set<Element>();
    const observeSurfaces = () => {
      const surfaces = new Set(document.querySelectorAll(".voople-group-surface-header, .voople-direct-workspace__header, .voople-chat-window > .voople-panel-header, .voople-chat-composer__surface"));
      for (const el of observed) if (!surfaces.has(el)) { observer.unobserve(el); observed.delete(el); }
      for (const el of surfaces) if (!observed.has(el)) { observer.observe(el); observed.add(el); }
      update();
    };
    const mutations = new MutationObserver(observeSurfaces);
    mutations.observe(document.body, { childList: true, subtree: true });
    observeSurfaces(); update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => { observer.disconnect(); mutations.disconnect(); window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); };
  }, [move]);
  return {
    style: point ? { left: point.x, top: point.y } : { right: GAP, top: 140 },
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || !position.current) return;
      suppressClick.current = false;
      gesture.current = { x: event.clientX, y: event.clientY, origin: position.current, dragged: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const current = gesture.current;
      if (!current) return;
      const dx = event.clientX - current.x, dy = event.clientY - current.y;
      current.dragged ||= Math.hypot(dx, dy) > 6;
      if (current.dragged) { movedByUser.current = true; move({ x: current.origin.x + dx, y: current.origin.y + dy }); }
    },
    onPointerUp() { suppressClick.current = gesture.current?.dragged ?? false; gesture.current = null; },
    onPointerCancel() { gesture.current = null; suppressClick.current = true; },
    onClickCapture(event: MouseEvent<HTMLButtonElement>) {
      if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; }
    },
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      if (event.key === "Enter" || event.key === " ") suppressClick.current = false;
      if (!event.altKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      movedByUser.current = true;
      const current = position.current;
      if (current) move({ x: current.x + (event.key === "ArrowRight" ? 16 : event.key === "ArrowLeft" ? -16 : 0), y: current.y + (event.key === "ArrowDown" ? 16 : event.key === "ArrowUp" ? -16 : 0) });
    },
  };
}
