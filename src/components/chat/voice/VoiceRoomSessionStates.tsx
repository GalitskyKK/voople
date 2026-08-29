"use client";

import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function VoiceRoomTransitionState({
  title,
  description,
  pending = true,
}: {
  title: string;
  description: string;
  pending?: boolean;
}) {
  return (
    <div
      className="voople-room-surface voople-room-surface__state flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4"
      aria-live="polite"
      aria-busy={pending}
    >
      <div className="flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-6 py-10 text-center">
        {pending ? (
          <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-accent)] motion-reduce:animate-none" />
        ) : null}
        <h3 className={cn("text-xl font-semibold", pending && "mt-5")}>{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export function VoiceRoomErrorState({
  message,
  retryLabel,
  retryPending,
  onRetry,
}: {
  message: string | null;
  retryLabel: string;
  retryPending: boolean;
  onRetry: () => void | Promise<void>;
}) {
  return (
    <div className="voople-room-surface voople-room-surface__state flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4">
      <div
        className="flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border border-red-500/30 bg-red-500/5 px-6 py-10 text-center"
        role="alert"
      >
        <h3 className="text-xl font-semibold">Не удалось завершить действие</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
          {message ?? "Проверьте подключение и повторите попытку."}
        </p>
        <Button
          type="button"
          className="mt-5"
          disabled={retryPending}
          onClick={() => void onRetry()}
        >
          {retryPending ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}

export function VoiceRoomPostLeaveState({
  connectLabel,
  connectDisabled,
  onConnect,
  onClose,
}: {
  connectLabel: string;
  connectDisabled: boolean;
  onConnect: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <div
      className="voople-room-surface voople-room-surface__state flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4"
      aria-live="polite"
    >
      <div className="flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-6 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <h3 className="mt-5 text-xl font-semibold">Вы вышли из комнаты</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--app-muted)]">
          Медиасессия завершена. Можно вернуться или закрыть комнату и продолжить переписку.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" disabled={connectDisabled} onClick={() => void onConnect()}>
            <RotateCcw className="h-4 w-4" />
            {connectLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
