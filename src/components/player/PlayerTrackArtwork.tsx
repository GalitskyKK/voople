import { Music2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlaylistTrackView } from "@/types/playlist";

function trackHue(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

export function PlayerTrackArtwork({ track, className }: { track: PlaylistTrackView; className?: string }) {
  const hue = trackHue(track.id);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/.12)]",
        className,
      )}
      style={{
        background: `radial-gradient(circle at 76% 18%, hsl(${(hue + 48) % 360} 82% 68% / .9), transparent 42%), linear-gradient(145deg, hsl(${hue} 62% 38%), hsl(${(hue + 42) % 360} 55% 14%))`,
      }}
      aria-hidden
    >
      <span className="absolute -bottom-3 -right-2 h-10 w-10 rounded-full border border-white/15" />
      <Music2 className="relative h-[42%] w-[42%] drop-shadow" />
    </span>
  );
}

export function PlayerTrackIdentity({
  track,
  className,
  artworkClassName,
}: {
  track: PlaylistTrackView;
  className?: string;
  artworkClassName?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <PlayerTrackArtwork track={track} className={cn("h-10 w-10", artworkClassName)} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{track.title}</span>
        <span className="block truncate text-xs text-[var(--app-muted)]">{track.artist}</span>
      </span>
    </span>
  );
}
