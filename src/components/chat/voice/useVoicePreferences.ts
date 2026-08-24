"use client";

import { useCallback, useRef, useState } from "react";

import {
  loadVoicePreferences,
  saveVoicePreferences,
  type VoicePreferences,
} from "@/lib/livekit/voice-preferences";

export function useVoicePreferences() {
  const [preferences, setPreferences] = useState(() => loadVoicePreferences());
  const preferencesRef = useRef(preferences);

  const persistPreferences = useCallback((patch: Partial<VoicePreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    saveVoicePreferences(next);
    return next;
  }, []);

  return { preferences, preferencesRef, persistPreferences };
}
