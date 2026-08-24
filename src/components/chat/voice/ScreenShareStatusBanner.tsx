import { cn } from "@/lib/utils";

export function ScreenShareStatusBanner({ hasAudio }: { hasAudio: boolean }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-xs text-[var(--app-muted)]" role="status">
      <span className={cn("h-2 w-2 rounded-full", hasAudio ? "bg-emerald-400" : "bg-amber-400")} />
      {hasAudio ? "Экран и звук передаются" : "Экран передаётся без звука"}
    </div>
  );
}
