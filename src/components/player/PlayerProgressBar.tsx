import { cn } from "@/lib/utils";

export function PlayerProgressBar({
  currentTime,
  duration,
  onSeek,
  className,
}: {
  currentTime: number;
  duration: number;
  onSeek: (value: number) => void;
  className?: string;
}) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrent = Math.min(Math.max(0, currentTime), safeDuration || 1);
  const ratio = safeDuration > 0 ? safeCurrent / safeDuration : 0;

  return (
    <div className={cn("group relative h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_9%,transparent)]", className)}>
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--theme-accent)] transition-[width] duration-100"
        style={{ width: `${ratio * 100}%` }}
      />
      <input
        type="range"
        min={0}
        max={safeDuration || 1}
        step={0.1}
        value={safeCurrent}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Позиция воспроизведения"
      />
    </div>
  );
}
