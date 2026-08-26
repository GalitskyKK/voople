"use client";

import { cn } from "@/lib/utils";

type VoiceMediaStageProps = {
  screenContainerRef: (element: HTMLDivElement | null) => void;
  screenShareOwner: string | null;
  focused?: boolean;
  onFocus?: () => void;
  className?: string;
};

export function VoiceMediaStage({
  screenContainerRef,
  screenShareOwner,
  focused = false,
  onFocus,
  className,
}: VoiceMediaStageProps) {
  return (
    <section
      className={cn(
        screenShareOwner
          ? "relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-black transition"
          : "hidden",
        focused
          ? "col-span-2 min-h-64 border-(--theme-accent) lg:col-span-4"
          : "min-h-32 border-[var(--app-border)]",
        className,
      )}
      aria-label={screenShareOwner ? `Демонстрация экрана: ${screenShareOwner}` : undefined}
    >
      {onFocus ? (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in"
          onClick={onFocus}
          aria-label={`Показать демонстрацию ${screenShareOwner} крупно`}
        />
      ) : null}
      <div className="relative z-[2] flex pointer-events-none items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/70">
        <span className="truncate">{screenShareOwner}</span>
        <span className="shrink-0">{focused ? "В фокусе" : "Демонстрация"}</span>
      </div>
      <div
        ref={screenContainerRef}
        data-voople-screen-stage=""
        className={cn(
          "grid min-h-0 min-w-0 max-h-full max-w-full place-items-center overflow-hidden [&>video]:h-full [&>video]:max-h-full [&>video]:w-full [&>video]:max-w-full [&>video]:object-contain [&>[data-livekit-local-screen]]:h-full [&>[data-livekit-local-screen]]:w-full",
          focused ? "h-full min-h-0" : "aspect-video h-full",
        )}
      />
    </section>
  );
}
