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
        "fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#1a1020] px-4 py-2 text-sm text-[var(--foreground)] shadow-lg",
        className,
      )}
    >
      {message}
    </div>
  );
}
