"use client";

import { cn } from "@/lib/utils";

export function Toast({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "voople-overlay-surface fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm text-[var(--foreground)]",
        className,
      )}
    >
      {message}
    </div>
  );
}
