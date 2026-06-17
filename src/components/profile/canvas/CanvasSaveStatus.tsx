"use client";

import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";

import type { CanvasSaveStatus } from "@/hooks/useProfileCanvasStrokes";
import { cn } from "@/lib/utils";

type CanvasSaveStatusBarProps = {
  status: CanvasSaveStatus;
  className?: string;
};

const LABELS: Record<CanvasSaveStatus, string> = {
  idle: "Каждый штрих сохраняется автоматически",
  saving: "Сохранение…",
  saved: "Сохранено",
  error: "Ошибка сохранения",
};

export function CanvasSaveStatusBar({ status, className }: CanvasSaveStatusBarProps) {
  const Icon =
    status === "saving"
      ? Loader2
      : status === "saved"
        ? Check
        : status === "error"
          ? CloudOff
          : Cloud;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
        status === "saved" && "bg-emerald-500/20 text-emerald-100",
        status === "saving" && "bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color-mix(in_srgb,var(--foreground)_80%,transparent)]",
        status === "error" && "bg-red-500/20 text-red-100",
        status === "idle" && "bg-black/40 text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", status === "saving" && "animate-spin")}
        aria-hidden
      />
      <span>{LABELS[status]}</span>
    </div>
  );
}
