"use client";

import type { RefObject } from "react";

type VoiceMediaStageProps = {
  screenContainerRef: RefObject<HTMLDivElement | null>;
  cameraContainerRef: RefObject<HTMLDivElement | null>;
  screenShareOwner: string | null;
  cameraCount: number;
};

export function VoiceMediaStage({
  screenContainerRef,
  cameraContainerRef,
  screenShareOwner,
  cameraCount,
}: VoiceMediaStageProps) {
  const hasVideo = Boolean(screenShareOwner || cameraCount > 0);

  return (
    <div className={hasVideo ? "mt-4 space-y-2" : "hidden"}>
      <section
        className={
          screenShareOwner
            ? "overflow-hidden rounded-2xl border border-[var(--app-border)] bg-black"
            : "hidden"
        }
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/70">
          <span>{screenShareOwner}</span>
          <span>Экран</span>
        </div>
        <div ref={screenContainerRef} className="aspect-video w-full overflow-hidden" />
      </section>

      <section
        ref={cameraContainerRef}
        className={
          cameraCount > 0
            ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2 overflow-hidden rounded-2xl"
            : "hidden"
        }
        aria-label="Камеры участников"
      />
    </div>
  );
}
