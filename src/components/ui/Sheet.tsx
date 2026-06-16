"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";

type SheetPlacement = "center" | "bottom";

export function Sheet({
  open,
  onClose,
  children,
  className,
  placement = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  placement?: SheetPlacement;
}) {
  const mounted = useIsClient();
  const isBottom = placement === "bottom";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex justify-center",
        isBottom ? "items-end" : "items-center p-4 sm:p-6",
      )}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-[101] voople-scroll max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto border border-[var(--app-border)] bg-[var(--background)] p-4 pt-5 shadow-[var(--app-shadow-md)]",
          isBottom ? "rounded-t-2xl pb-6" : "rounded-2xl",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
