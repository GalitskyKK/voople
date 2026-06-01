"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

export type CanvasPixelSize = { width: number; height: number };

/** ResizeObserver + DPR: синхронизирует буфер canvas с CSS-размером контейнера */
export function useCanvasSize(
  containerRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onResize: (size: CanvasPixelSize) => void,
) {
  const sizeRef = useRef<CanvasPixelSize>({ width: 0, height: 0 });

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    sizeRef.current = { width: cssWidth, height: cssHeight };
    onResize(sizeRef.current);
  }, [canvasRef, containerRef, onResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    syncSize();
    const observer = new ResizeObserver(() => syncSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, syncSize]);

  return sizeRef;
}
