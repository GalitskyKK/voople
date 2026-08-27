"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useIsClient } from "@/hooks/useIsClient";

type TooltipPosition = { left: number; top: number };

export function SidebarItemTooltip({
  label,
  enabled,
  children,
  className,
}: {
  label: string;
  enabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const mounted = useIsClient();

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: Math.min(rect.right + 10, window.innerWidth - 168),
      top: Math.max(
        24,
        Math.min(rect.top + rect.height / 2, window.innerHeight - 24),
      ),
    });
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !open) return;
    updatePosition();
  }, [enabled, open, updatePosition]);

  useEffect(() => {
    if (!enabled || !open) return;
    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [enabled, open, updatePosition]);

  return (
    <div
      ref={anchorRef}
      className={className}
      onPointerEnter={() => enabled && setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => enabled && setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {children}
      {enabled && open && position && mounted
        ? createPortal(
            <span
              role="tooltip"
              className="voople-sidebar-tooltip"
              style={{ left: position.left, top: position.top }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}
