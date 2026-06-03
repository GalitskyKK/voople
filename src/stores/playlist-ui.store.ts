import { create } from "zustand";

type PlaylistUiState = {
  open: boolean;
  username: string | null;
  focusTrackId: string | null;
  openPlaylist: (username: string, focusTrackId?: string | null) => void;
  closePlaylist: () => void;
};

export const usePlaylistUiStore = create<PlaylistUiState>((set) => ({
  open: false,
  username: null,
  focusTrackId: null,
  openPlaylist: (username, focusTrackId = null) =>
    set({ open: true, username, focusTrackId }),
  closePlaylist: () => set({ open: false, username: null, focusTrackId: null }),
}));
