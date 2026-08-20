"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { VoicePreferences } from "@/lib/livekit/voice-preferences";
import { getAudioCaptureOptions } from "./voice-room-config";

export function useVoiceMicTest({
  preferencesRef,
  refreshDevices,
  setError,
}: {
  preferencesRef: RefObject<VoicePreferences>;
  refreshDevices: (requestPermissions?: boolean) => Promise<void>;
  setError: (message: string | null) => void;
}) {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);

  const stop = useCallback((updateState = true) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    if (updateState) {
      setActive(false);
      setLevel(0);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (active) {
      stop();
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioCaptureOptions(preferencesRef.current) as MediaTrackConstraints,
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      contextRef.current = context;
      setActive(true);
      await refreshDevices(true);
      const measure = () => {
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        setLevel(Math.min(100, Math.round(average * 1.6)));
        frameRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch {
      stop();
      setError("Не удалось открыть микрофон. Проверьте разрешение браузера и выбранное устройство.");
    }
  }, [active, preferencesRef, refreshDevices, setError, stop]);

  useEffect(() => () => stop(false), [stop]);
  return { active, level, stop, toggle };
}
