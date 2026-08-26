import { cn } from "@/lib/utils";

export function ScreenShareStatusBanner({
  hasAudio,
  previewVisible,
  onPreviewToggle,
}: {
  hasAudio: boolean;
  previewVisible: boolean;
  onPreviewToggle: () => void;
}) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-xs text-[var(--app-muted)]" role="status">
      <span className={cn("h-2 w-2 rounded-full", hasAudio ? "bg-emerald-400" : "bg-amber-400")} />
      <span className="min-w-0 flex-1">
        {hasAudio ? "Экран и звук передаются" : "Экран передаётся без звука"}
      </span>
      <button
        type="button"
        onClick={onPreviewToggle}
        className="rounded-lg px-2 py-1 font-medium text-[var(--foreground)] transition hover:bg-[var(--app-surface-hover)]"
      >
        {previewVisible ? "Скрыть предпросмотр" : "Смотреть предпросмотр"}
      </button>
    </div>
  );
}
