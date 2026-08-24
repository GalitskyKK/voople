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
  const [pending, setPending] = useState(false);
  const [level, setLevel] = useState(0);
  const activeRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const pendingRef = useRef(false);

  const stop = useCallback((updateState = true) => {
    generationRef.current += 1;
    activeRef.current = false;
    pendingRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    if (updateState) {
      setActive(false);
      setPending(false);
      setLevel(0);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (pendingRef.current) return;
    if (activeRef.current) {
      stop();
      return;
    }
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioCaptureOptions(preferencesRef.current) as MediaTrackConstraints,
      });
      if (!mountedRef.current || generationRef.current !== generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      contextRef.current = context;
      activeRef.current = true;
      setActive(true);
      await refreshDevices(true);
      if (!mountedRef.current || generationRef.current !== generation) return;
      pendingRef.current = false;
      setPending(false);
      const measure = () => {
        if (!mountedRef.current || generationRef.current !== generation) return;
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        setLevel(Math.min(100, Math.round(average * 1.6)));
        frameRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch {
      if (!mountedRef.current || generationRef.current !== generation) return;
      stop();
      setError("Не удалось открыть микрофон. Проверьте разрешение браузера и выбранное устройство.");
    }
  }, [preferencesRef, refreshDevices, setError, stop]);

  useEffect(() => () => {
    mountedRef.current = false;
    stop(false);
  }, [stop]);
  return { active, pending, level, stop, toggle };
}
