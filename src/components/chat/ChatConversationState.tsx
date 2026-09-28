"use client";

import { LoaderCircle, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

type ConversationStateMode = "loading" | "offline" | "error";

const STATE_COPY: Record<ConversationStateMode, { title: string; detail: string }> = {
  loading: {
    title: "Открываем переписку",
    detail: "Сообщения и ваш черновик появятся здесь.",
  },
  offline: {
    title: "Нет соединения",
    detail: "Переписка обновится после восстановления сети. Черновик останется на месте.",
  },
  error: {
    title: "Не удалось обновить переписку",
    detail: "Можно продолжить с сохранёнными сообщениями или повторить загрузку.",
  },
};

export function ChatConversationState({
  mode,
  variant = "panel",
  message,
  onRetry,
}: {
  mode: ConversationStateMode;
  variant?: "panel" | "inline";
  message?: string | null;
  onRetry?: () => void;
}) {
  const copy = STATE_COPY[mode];
  const Icon = mode === "loading" ? LoaderCircle : mode === "offline" ? WifiOff : TriangleAlert;
  const compact = variant === "inline";

  return (
    <section
      className={cn(
        "voople-chat-state text-[var(--foreground)]",
        compact
          ? "flex min-h-10 shrink-0 items-center gap-2 bg-[var(--material-control-fill)] px-3 py-1.5"
          : "flex min-h-0 flex-1 items-center justify-center px-5 py-8",
      )}
      role={mode === "loading" ? "status" : "alert"}
      aria-live={mode === "loading" ? "polite" : "assertive"}
    >
      <div className={cn("flex min-w-0 items-center", compact ? "w-full gap-2" : "max-w-sm flex-col text-center")}>
        <span
          className={cn(
            "grid shrink-0 place-items-center text-[var(--theme-accent)]",
            compact ? "h-7 w-7" : "mb-4 h-8 w-8",
          )}
          aria-hidden="true"
        >
          <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", mode === "loading" && "animate-spin")} />
        </span>
        <div className={cn("min-w-0", compact && "flex-1")}>
          <p className={cn("font-semibold", compact ? "text-xs" : "text-base")}>{copy.title}</p>
          <p className={cn("text-[var(--app-muted)]", compact ? "truncate text-[11px]" : "mt-1 text-sm leading-5")}>
            {message || copy.detail}
          </p>
        </div>
        {mode !== "loading" && onRetry ? (
          <button
            type="button"
            className={cn(
              "voople-material-control inline-flex shrink-0 items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
              compact ? "min-h-9 px-2 text-xs" : "mt-4 min-h-10 px-3 text-sm",
            )}
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Повторить
          </button>
        ) : null}
      </div>
    </section>
  );
}
