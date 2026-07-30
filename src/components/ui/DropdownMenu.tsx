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
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";

type DropdownMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  menuClassName?: string;
  className?: string;
};

type MenuPosition = { top: number; left: number; minWidth: number };

export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  align = "end",
  menuClassName,
  className,
}: DropdownMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useIsClient();
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const menuWidth = Math.max(200, rect.width);
    const menuHeight = menuRef.current?.offsetHeight ?? 160;
    const gap = 4;

    let top = rect.bottom + gap;
    let left = align === "end" ? rect.right - menuWidth : rect.left;

    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - gap - menuHeight);
    }
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    setPosition({ top, left, minWidth: menuWidth });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
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

  const menu =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[110] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 text-[var(--foreground)] shadow-[var(--app-shadow-md)]",
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
      <div ref={triggerRef} className={cn("inline-flex", className)}>
        {triggerNode}
      </div>
      {menu}
    </>
  );
}
