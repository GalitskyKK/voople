import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export function GroupPeopleLoadingState() {
  return (
    <div
      className="voople-group-people-state mr-auto w-[calc(100%-2rem)] max-w-[760px] space-y-2 sm:w-[calc(100%-3rem)]"
      role="status"
      aria-label="Загружаем участников"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="voople-material-row flex min-h-14 items-center gap-3 px-3">
          <Skeleton shape="avatar" className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-28 max-w-full" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
      ))}
    </div>
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
        className="voople-material-control inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Повторить
      </button>
    </div>
  );
}
