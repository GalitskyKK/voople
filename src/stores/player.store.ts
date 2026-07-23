import { create } from "zustand";

import { writeStoredVolume } from "@/lib/player/volume-storage";
import type { PlaylistTrackView } from "@/types/playlist";

export type PlayerTrack = PlaylistTrackView;

type PlayerState = {
  current: PlayerTrack | null;
  queue: PlayerTrack[];
  queueIndex: number;
  sourceUsername: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  expanded: boolean;
  mobilePlayerExpanded: boolean;
  volume: number;
  play: (
    track: PlayerTrack,
    options?: { queue?: PlayerTrack[]; queueIndex?: number; sourceUsername?: string },
  ) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setExpanded: (expanded: boolean) => void;
  setMobilePlayerExpanded: (expanded: boolean) => void;
  setVolume: (volume: number) => void;
};

function findQueueIndex(queue: PlayerTrack[], trackId: string) {
  return queue.findIndex((t) => t.id === trackId);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  queueIndex: -1,
  sourceUsername: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  expanded: false,
  mobilePlayerExpanded: true,
  volume: 1,

  play: (track, options) => {
    const queue = options?.queue?.length ? options.queue : [track];
    const queueIndex =
      options?.queueIndex ??
      (options?.queue ? findQueueIndex(queue, track.id) : 0);

    set({
      current: track,
      queue,
      queueIndex: queueIndex >= 0 ? queueIndex : 0,
      sourceUsername: options?.sourceUsername ?? get().sourceUsername,
      isPlaying: true,
      currentTime: 0,
      duration: track.durationSeconds ?? 0,
      mobilePlayerExpanded: true,
    });
  },

  togglePlay: () => {
    const { isPlaying, current } = get();
    if (!current) return;
    set({ isPlaying: !isPlaying });
  },

  pause: () => set({ isPlaying: false }),

  resume: () => {
    if (get().current) set({ isPlaying: true });
  },

  stop: () =>
    set({
      current: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      expanded: false,
      mobilePlayerExpanded: true,
      sourceUsername: null,
    }),

  next: () => {
    const { queue, queueIndex } = get();
    if (queue.length < 2) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    const track = queue[nextIndex];
    if (!track) return;
    set({
      current: track,
      queueIndex: nextIndex,
      isPlaying: true,
      currentTime: 0,
      duration: track.durationSeconds ?? 0,
    });
  },

  prev: () => {
    const { queue, queueIndex } = get();
    if (queue.length < 2) return;
    const prevIndex = (queueIndex - 1 + queue.length) % queue.length;
    const track = queue[prevIndex];
    if (!track) return;
    set({
      current: track,
      queueIndex: prevIndex,
      isPlaying: true,
      currentTime: 0,
      duration: track.durationSeconds ?? 0,
    });
  },

  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setExpanded: (expanded) => set({ expanded }),
  setMobilePlayerExpanded: (mobilePlayerExpanded) => set({ mobilePlayerExpanded }),

  setVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, volume));
    writeStoredVolume(clamped);
    set({ volume: clamped });
  },
}));
