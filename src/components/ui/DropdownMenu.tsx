"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";

type DropdownMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  anchorPoint?: { x: number; y: number } | null;
  align?: "start" | "end";
  side?: "bottom" | "left" | "right" | "inward";
  menuClassName?: string;
  className?: string;
};

type MenuPosition = { top: number; left: number; minWidth: number };

export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  anchorPoint = null,
  align = "end",
  side = "bottom",
  menuClassName,
  className,
}: DropdownMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useIsClient();
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const focusedOpenRef = useRef(false);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl && !anchorPoint) return;

    const rect = triggerEl?.getBoundingClientRect();
    const anchorWidth = rect?.width ?? 0;
    const anchorLeft = anchorPoint?.x ?? rect?.left ?? 0;
    const anchorRight = anchorPoint?.x ?? rect?.right ?? 0;
    const anchorTop = anchorPoint?.y ?? rect?.top ?? 0;
    const anchorBottom = anchorPoint?.y ?? rect?.bottom ?? 0;
    const menuWidth = menuRef.current?.offsetWidth ?? Math.max(200, anchorWidth);
    const menuHeight = menuRef.current?.offsetHeight ?? 160;
    const gap = 4;

    const resolvedSide = side === "inward"
      ? anchorLeft + anchorWidth / 2 > window.innerWidth / 2 ? "left" : "right"
      : side;
    let top = resolvedSide === "bottom" ? anchorBottom + gap : anchorTop;
    let left = align === "end" ? anchorRight - menuWidth : anchorLeft;

    if (resolvedSide === "left") {
      left = anchorLeft - gap - menuWidth;
      if (left < 8) left = anchorRight + gap;
    } else if (resolvedSide === "right") {
      left = anchorRight + gap;
      if (left + menuWidth > window.innerWidth - 8) {
        left = anchorLeft - gap - menuWidth;
      }
    } else if (top + menuHeight > window.innerHeight - 8) {
      top = anchorTop - gap - menuHeight;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    setPosition({ top, left, minWidth: menuWidth });
  }, [align, anchorPoint, side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [onOpenChange, open, updatePosition]);

  useEffect(() => {
    if (!open) {
      focusedOpenRef.current = false;
      return;
    }
    if (!position || focusedOpenRef.current) return;
    focusedOpenRef.current = true;
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, position]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const offset = event.key === "ArrowDown" ? 1 : -1;
    items[(current + offset + items.length) % items.length]?.focus();
  };

  const menu =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className={cn(
              "voople-dropdown-menu fixed z-[110] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 text-[var(--foreground)] shadow-[var(--app-shadow-md)]",
              menuClassName,
            )}
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
            }}
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  const triggerNode = isValidElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>(trigger)
    ? cloneElement(trigger, {
        onClick: (event: MouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) {
            event.stopPropagation();
            onOpenChange(!open);
          }
        },
      } as HTMLAttributes<HTMLElement>)
    : trigger;

  return (
    <>
      {triggerNode ? (
        <div ref={triggerRef} className={cn("inline-flex", className)}>
          {triggerNode}
        </div>
      ) : null}
      {menu}
    </>
  );
}
