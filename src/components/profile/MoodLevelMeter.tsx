import { cn } from "@/lib/utils";

type MoodLevelMeterProps = {
  value: number;
  color: string;
  className?: string;
  light?: boolean;
};

export function MoodLevelMeter({ value, color, className, light = false }: MoodLevelMeterProps) {
  const normalized = Math.max(1, Math.min(10, Math.round(value)));

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="meter"
      aria-label="Уровень настроения"
      aria-valuemin={1}
      aria-valuemax={10}
      aria-valuenow={normalized}
    >
      <div className={cn("h-1.5 min-w-0 flex-1 overflow-hidden rounded-full", light ? "bg-white/12" : "bg-[color-mix(in_srgb,var(--foreground)_9%,transparent)]")}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${normalized * 10}%`, backgroundColor: color }}
        />
      </div>
      <span className={cn("shrink-0 text-[10px] font-medium tabular-nums", light ? "text-white/48" : "text-[var(--app-muted)]")}>
        {normalized}/10
      </span>
    </div>
  );
}
