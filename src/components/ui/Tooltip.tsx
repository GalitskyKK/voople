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
import {
  resolveTooltipPosition,
  type TooltipSide,
} from "@/lib/layout/tooltip-position";
import { cn } from "@/lib/utils";

type TooltipPosition = { left: number; top: number; side: TooltipSide };

function ownsEventTarget(currentTarget: HTMLElement, target: EventTarget | null) {
  return target instanceof Node && currentTarget.contains(target);
}

function readViewportInset(name: string) {
  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : 0;
}

export function Tooltip({
  label,
  children,
  side = "top",
  disabled = false,
  delay = 420,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  disabled?: boolean;
  delay?: number;
  className?: string;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const mounted = useIsClient();

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
    setPosition(null);
  }, [clearTimer]);

  const openAfterDelay = useCallback(() => {
    if (disabled) return;
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), delay);
  }, [clearTimer, delay, disabled]);

  const updatePosition = useCallback(() => {
    const anchorElement = anchorRef.current?.firstElementChild ?? anchorRef.current;
    const anchor = anchorElement?.getBoundingClientRect();
    const tooltip = tooltipRef.current?.getBoundingClientRect();
    if (!anchor || !tooltip) return;

    setPosition(resolveTooltipPosition({
      anchor,
      tooltip,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      preferredSide: side,
      insets: {
        top: readViewportInset("--voople-tooltip-viewport-top"),
      },
    }));
  }, [side]);

  useLayoutEffect(() => {
    if (open && mounted) updatePosition();
  }, [mounted, open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleViewportChange = () => updatePosition();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open, updatePosition]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <span
      ref={anchorRef}
      className={cn("voople-tooltip-anchor", className)}
      onPointerEnter={(event) => {
        if (
          event.pointerType !== "touch" &&
          ownsEventTarget(event.currentTarget, event.target)
        ) {
          openAfterDelay();
        }
      }}
      onPointerLeave={close}
      onFocusCapture={(event) => {
        if (!disabled && ownsEventTarget(event.currentTarget, event.target)) {
          clearTimer();
          setOpen(true);
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onClick={close}
    >
      {children}
      {!disabled && open && mounted
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              className="voople-tooltip"
              data-side={position?.side ?? side}
              style={{
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
