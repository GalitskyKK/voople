"use client";

import { AudioPlayerProvider } from "./AudioPlayerProvider";
import { GlobalPlayer } from "./GlobalPlayer";
import { PlaylistModal } from "./PlaylistModal";

export function PlayerShell() {
  return (
    <>
      <AudioPlayerProvider />
      <PlaylistModal />
      <GlobalPlayer variant="mobile" />
    </>
  );
}
