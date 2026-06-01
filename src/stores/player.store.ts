import { create } from "zustand";

type Track = { id: string; title: string; artist: string; fileUrl: string };

type PlayerState = {
  current: Track | null;
  queue: Track[];
  isPlaying: boolean;
  setTrack: (track: Track) => void;
  setPlaying: (playing: boolean) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  current: null,
  queue: [],
  isPlaying: false,
  setTrack: (track) => set({ current: track }),
  setPlaying: (isPlaying) => set({ isPlaying }),
}));
