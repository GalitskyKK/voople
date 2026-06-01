"use client";

import { cn } from "@/lib/utils";

type SliderProps = {
  min: number;
  max: number;
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  thumb?: React.ReactNode;
};

export function Slider({
  min,
  max,
  value,
  onChange,
  readOnly = false,
  className,
  thumb,
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  const interactive = !readOnly && Boolean(onChange);

  return (
    <div className={cn("relative h-8 w-full", className)}>
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[var(--theme-accent,#7B3AED)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {interactive && (
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      )}
      {thumb && (
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-xl"
          style={{ left: `calc(${percent}% - 12px)` }}
        >
          {thumb}
        </div>
      )}
    </div>
  );
}
