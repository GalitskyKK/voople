"use client";

import type { RefObject } from "react";

type VoiceMediaStageProps = {
  screenContainerRef: RefObject<HTMLDivElement | null>;
  screenShareOwner: string | null;
};

export function VoiceMediaStage({
  screenContainerRef,
  screenShareOwner,
}: VoiceMediaStageProps) {
  return (
    <section
      className={screenShareOwner
        ? "min-h-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-black"
        : "hidden"}
      aria-label={screenShareOwner ? `Демонстрация экрана: ${screenShareOwner}` : undefined}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/70">
        <span className="truncate">{screenShareOwner}</span>
        <span className="shrink-0">Демонстрация экрана</span>
      </div>
      <div ref={screenContainerRef} className="aspect-video max-h-[min(56dvh,32rem)] w-full overflow-hidden" />
    </section>
  );
}
