"use client";

import { usePlaylistUiStore } from "@/stores/playlist-ui.store";
import type { StatusPostPayload } from "@/types/domain";
import { StatusPostBodyVisual } from "./StatusPostBodyVisual";

type StatusPostBodyProps = {
  status: StatusPostPayload;
  authorUsername: string;
  className?: string;
};

/** Compact published mood snapshot: expressive, but deliberately shorter than a regular media post. */
export function StatusPostBody({ status, authorUsername, className }: StatusPostBodyProps) {
  const openPlaylist = usePlaylistUiStore((state) => state.openPlaylist);

  return (
    <StatusPostBodyVisual
      status={status}
      className={className}
      onMusicClick={() =>
        openPlaylist(authorUsername, status.trackId ?? null)
      }
    />
  );
}
