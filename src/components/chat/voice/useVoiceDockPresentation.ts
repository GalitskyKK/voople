"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  parseVoiceDockMode,
  reduceVoiceDockPresentation,
  VOICE_DOCK_MODE_KEY,
  type VoiceDockMode,
  type VoiceDockPresentation,
} from "@/lib/livekit/voice-dock-presentation";

function initialPresentation(fullOpen: boolean): VoiceDockPresentation {
  let stored: string | null = null;
  try {
    if (typeof window !== "undefined") stored = window.localStorage.getItem(VOICE_DOCK_MODE_KEY);
  } catch {
    // Private browsing can deny localStorage; the compact default remains usable.
  }
  return { fullOpen, dockVisible: false, dockMode: parseVoiceDockMode(stored) };
}

export function useVoiceDockPresentation(initialOpen: boolean) {
  const [state, dispatch] = useReducer(reduceVoiceDockPresentation, initialOpen, initialPresentation);
  const joinedRef = useRef(false);
  const joined = useCallback(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    dispatch({ type: "joined" });
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(VOICE_DOCK_MODE_KEY, state.dockMode); } catch { /* optional preference */ }
  }, [state.dockMode]);

  return {
    ...state,
    joined,
    openFull: () => dispatch({ type: "open-full" }),
    closeToMini: () => dispatch({ type: "close-to-mini" }),
    closeToCompact: () => dispatch({ type: "close-to-compact" }),
    hide: () => dispatch({ type: "hide" }),
    changeMode: (mode: VoiceDockMode) => dispatch({ type: "change-mode", mode }),
    leaveConfirmed: () => dispatch({ type: "leave-confirmed" }),
  };
}
