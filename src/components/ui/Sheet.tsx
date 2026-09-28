"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";

type SheetPlacement = "center" | "bottom" | "right" | "context";

export function Sheet({
  open,
  onClose,
  children,
  className,
  placement = "center",
  ariaLabel,
  containerClassName,
  closeOnEscape = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  placement?: SheetPlacement;
  ariaLabel?: string;
  containerClassName?: string;
  closeOnEscape?: boolean;
}) {
  const mounted = useIsClient();
  const isBottom = placement === "bottom";
  const isRight = placement === "right";
  const isContext = placement === "context";
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const activeElement = document.activeElement;
    returnFocusRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;

    return () => {
      const returnTarget = returnFocusRef.current;
      returnFocusRef.current = null;
      if (!returnTarget?.isConnected) return;

      window.requestAnimationFrame(() => {
        if (returnTarget.isConnected) returnTarget.focus({ preventScroll: true });
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !closeOnEscape) return;
      if (document.querySelector('[data-voople-dropdown-menu="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    const previousOverflow = document.body.style.overflow;
    if (!isContext) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      if (!isContext) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeOnEscape, isContext, open, onClose]);

  if (!open || !mounted) return null;

  const desktopOverlayRoot = document.getElementById("voople-desktop-overlay-root");
  const portalTarget = desktopOverlayRoot ?? document.body;

  return createPortal(
    <div
      className={cn(
        desktopOverlayRoot
          ? "absolute inset-0 z-[100] flex justify-center"
          : "fixed inset-0 z-[100] flex justify-center",
        isContext
          ? "items-end lg:items-start lg:justify-end lg:p-4 lg:pt-18"
          : isBottom
          ? "items-end"
          : isRight
            ? "items-stretch justify-end"
            : "items-center p-4 sm:p-6",
        containerClassName,
      )}
      role="presentation"
    >
      <button
        type="button"
        className={isContext ? "absolute inset-0 bg-black/45 lg:bg-transparent" : "absolute inset-0 bg-black/65"}
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div
        role="dialog"
        aria-modal={isContext ? undefined : "true"}
        aria-label={ariaLabel}
        className={cn(
          "voople-overlay-surface relative z-[101] voople-scroll max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto p-4 pt-5",
          isContext
            ? "max-h-[min(85dvh,680px)] rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:max-h-[calc(100dvh-5.5rem)] lg:max-w-[350px] lg:rounded-2xl lg:pb-5"
            : isBottom
            ? "rounded-t-2xl pb-6"
            : isRight
              ? "h-dvh max-h-none max-w-sm rounded-none border-y-0 border-r-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
              : "rounded-2xl",
          className,
        )}
      >
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[color-mix(in_srgb,var(--foreground)_50%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[var(--foreground)]"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>,
    portalTarget,
  );
}
