import { RefreshCw } from "lucide-react";

export function GroupPeopleLoadingState() {
  return (
    <div
      className="voople-group-people-state voople-group-people-list mr-auto h-48 w-[calc(100%-2rem)] max-w-[760px] animate-pulse sm:w-[calc(100%-3rem)]"
      aria-label="Загружаем участников"
    />
  );
}

export function GroupPeopleErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="voople-group-people-state voople-group-people-list mr-auto flex min-h-56 w-[calc(100%-2rem)] max-w-[760px] flex-col items-center justify-center gap-3 px-5 text-center text-[var(--foreground)] sm:w-[calc(100%-3rem)]"
      role="alert"
    >
      <p className="text-sm font-medium">Не удалось загрузить участников</p>
      <p className="max-w-md text-xs leading-5 text-[var(--app-muted)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 items-center gap-2 border border-[var(--app-border)] px-3 text-xs font-semibold hover:bg-[var(--app-surface-soft)]"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Повторить
      </button>
    </div>
  );
}
