"use client";

export function MiniPlayer() {
  return (
    <div className="fixed bottom-[5.5rem] left-0 right-0 z-20 hidden border-t border-[var(--app-border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 py-2 backdrop-blur-md md:block">
      <p className="truncate text-xs text-white/50">Плеер — скоро</p>
    </div>
  );
}
