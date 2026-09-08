"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";

export function VoiceRoomSwitchStatus({ roomName }: { roomName: string }) {
  return (
    <div
      className="voople-full-room__switch-status absolute inset-0 z-20 grid place-items-center bg-[var(--background)] px-6 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex max-w-md flex-col items-center">
        <div className="flex items-center gap-2 text-[var(--theme-accent)]" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-current" />
          <ArrowRight className="h-4 w-4" />
          <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.05em]">
          Переходим в {roomName}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
          Сохраняем настройки звука и подключаем новую комнату.
        </p>
      </div>
    </div>
  );
}
