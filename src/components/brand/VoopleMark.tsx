import { cn } from "@/lib/utils";

type VoopleMarkProps = {
  className?: string;
  tauriDragRegion?: boolean;
};

/** Canonical Voople mark shared by public pages, web shell and Tauri chrome. */
export function VoopleMark({ className, tauriDragRegion = false }: VoopleMarkProps) {
  return (
    <span
      className={cn("voople-brand-mark", className)}
      aria-hidden="true"
      data-tauri-drag-region={tauriDragRegion ? "" : undefined}
    >
      {/* Shared by Next.js and Vite/Tauri, so next/image cannot be used here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon/android-chrome-192x192.png"
        alt=""
        width={192}
        height={192}
        draggable={false}
      />
    </span>
  );
}
