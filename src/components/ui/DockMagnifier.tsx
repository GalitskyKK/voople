"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Stable hit targets; only the icon inside each target changes scale. */
export function DockMagnifier({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const reset = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    root.current?.querySelectorAll<HTMLElement>("[data-dock-item]").forEach((item) => item.style.removeProperty("--dock-scale"));
  };
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  return <div ref={root} className={className} onPointerLeave={reset}
    onPointerMove={(event) => {
      if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true") return;
      const y = event.clientY;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const items = [...(root.current?.querySelectorAll<HTMLElement>("[data-dock-item]") ?? [])];
        const scales = items.map((item) => {
          const box = item.getBoundingClientRect();
          const proximity = Math.max(0, 1 - Math.abs(y - box.top - box.height / 2) / 100);
          return 1 + proximity * proximity * .24;
        });
        items.forEach((item, index) => item.style.setProperty("--dock-scale", String(scales[index])));
      });
    }}>{children}</div>;
}
