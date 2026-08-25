"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioPresets, Track, type Room } from "livekit-client";

import {
  getDesktopProcessAudioBridge,
  resolveDesktopProcessAudioSource,
  type DesktopCaptureSource,
  type DesktopProcessAudioSource,
} from "@/lib/livekit/desktop-process-audio";
import { trpc } from "@/lib/trpc/client";
import {
  getScreenShareCaptureOptions,
  getBrowserDisplayMediaOptions,
  getScreenSharePublishOptions,
  type ScreenShareQuality,
} from "./voice-room-config";

type NativeCaptureRequest = {
  processId: number | null;
  captureSource: DesktopCaptureSource;
  quality: ScreenShareQuality;
};

type NativeStartResult = {
  active: boolean;
  warning: string | null;
};

export function useDesktopScreenAudioPublisher(chatId: string) {
  const token = trpc.chat.roomScreenAudioToken.useMutation();
  const sessionIdRef = useRef<string | null>(null);
  const nativePublisherSupportedRef = useRef(false);
  const automaticProcessIdRef = useRef<number | null>(null);
  const sourcesRef = useRef<DesktopProcessAudioSource[]>([]);
  const browserCaptureRef = useRef<MediaStream | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const operationRef = useRef(0);
  const startRef = useRef<(request: NativeCaptureRequest, operation: number) => Promise<NativeStartResult>>(
    async () => ({ active: false, warning: null }),
  );
  const pickerResolverRef = useRef<((source: DesktopCaptureSource | null) => void) | null>(null);
  const [capturePicker, setCapturePicker] = useState<DesktopCaptureSource[] | null>(null);

  const scheduleRefresh = useCallback((request: NativeCaptureRequest, operation: number, delay: number) => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    const run = () => {
      if (operationRef.current !== operation) return;
      void startRef.current(request, operation).catch((error) => {
        if (operationRef.current !== operation) return;
        console.warn("Screen audio lease refresh failed", {
          message: error instanceof Error ? error.message : String(error),
          retryAfterMs: 30_000,
        });
        refreshTimerRef.current = window.setTimeout(run, 30_000);
      });
    };
    refreshTimerRef.current = window.setTimeout(run, delay);
  }, []);

  const requestCaptureSource = useCallback((sources: DesktopCaptureSource[]) => {
    pickerResolverRef.current?.(null);
    setCapturePicker(sources);
    return new Promise<DesktopCaptureSource | null>((resolve) => {
      pickerResolverRef.current = resolve;
    });
  }, []);

  const resolveCapturePicker = useCallback((source: DesktopCaptureSource | null) => {
    const resolve = pickerResolverRef.current;
    pickerResolverRef.current = null;
    setCapturePicker(null);
    resolve?.(source);
  }, []);

  useEffect(() => {
    let active = true;
    const bridge = getDesktopProcessAudioBridge();
    if (!bridge) return;
    const refreshCapabilities = async () => {
      try {
        const capabilities = await bridge.capabilities();
        if (!active) return;
        nativePublisherSupportedRef.current = capabilities.publisherSupported;
        if (!capabilities.publisherSupported) {
          automaticProcessIdRef.current = null;
          sourcesRef.current = [];
          return;
        }
        const sources = await bridge.listSources();
        if (!active) return;
        sourcesRef.current = sources;
        automaticProcessIdRef.current = resolveDesktopProcessAudioSource(sources, null);
      } catch {
        if (active) {
          nativePublisherSupportedRef.current = false;
          automaticProcessIdRef.current = null;
          sourcesRef.current = [];
        }
      }
    };
    void refreshCapabilities();
    const refreshId = window.setInterval(() => void refreshCapabilities(), 5_000);
    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, []);

  const stopResources = useCallback(async () => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    const bridge = getDesktopProcessAudioBridge();
    if (bridge && sessionId) await bridge.stop(sessionId).catch(() => undefined);
    browserCaptureRef.current?.getTracks().forEach((track) => track.stop());
    browserCaptureRef.current = null;
  }, []);

  const stop = useCallback(async () => {
    operationRef.current += 1;
    await stopResources();
  }, [stopResources]);

  const startBrowserCapture = useCallback(async (room: Room, quality: ScreenShareQuality) => {
    const stream = await navigator.mediaDevices.getDisplayMedia(
      getBrowserDisplayMediaOptions(quality),
    );
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    if (!videoTrack) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Выбранная поверхность не предоставила видеодорожку.");
    }
    const streamName = `screen-${crypto.randomUUID()}`;
    browserCaptureRef.current = stream;
    try {
      await room.localParticipant.publishTrack(videoTrack, {
        ...getScreenSharePublishOptions(quality),
        source: Track.Source.ScreenShare,
        stream: streamName,
      });
      if (audioTrack) {
        await room.localParticipant.publishTrack(audioTrack, {
          audioPreset: AudioPresets.musicHighQuality,
          dtx: false,
          forceStereo: true,
          red: true,
          source: Track.Source.ScreenShareAudio,
          stream: streamName,
        });
      }
    } catch (cause) {
      await room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
      stream.getTracks().forEach((track) => track.stop());
      browserCaptureRef.current = null;
      throw cause;
    }
    videoTrack.addEventListener("ended", () => {
      audioTrack?.stop();
      browserCaptureRef.current = null;
      void room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
    }, { once: true });
    return Boolean(audioTrack);
  }, []);

  const start = useCallback(async (
    request: NativeCaptureRequest,
    operation: number,
  ): Promise<NativeStartResult> => {
    const bridge = getDesktopProcessAudioBridge();
    if (!bridge) return { active: false, warning: "Нативный модуль демонстрации недоступен." };
    const capabilities = await bridge.capabilities();
    if (operationRef.current !== operation) return { active: false, warning: null };
    if (!capabilities.publisherSupported) {
      return { active: false, warning: "Нативный модуль демонстрации недоступен в этой системе." };
    }
    const screenSessionId = crypto.randomUUID();
    const credentials = await token.mutateAsync({ chatId, screenSessionId });
    if (operationRef.current !== operation) return { active: false, warning: null };
    await stopResources();
    if (operationRef.current !== operation) return { active: false, warning: null };
    const plus = request.quality === "plus";
    sessionIdRef.current = screenSessionId;
    try {
      await bridge.start({
        processId: request.processId,
        captureSource: { id: request.captureSource.id, kind: request.captureSource.kind },
        captureWidth: plus ? 1920 : 1280,
        captureHeight: plus ? 1080 : 720,
        captureFrameRate: plus ? 60 : 30,
        livekitUrl: credentials.url,
        token: credentials.token,
        screenSessionId,
      });
    } catch (cause) {
      if (sessionIdRef.current === screenSessionId) sessionIdRef.current = null;
      if (operationRef.current !== operation) return { active: false, warning: null };
      throw cause;
    }
    if (operationRef.current !== operation) {
      if (sessionIdRef.current === screenSessionId) sessionIdRef.current = null;
      await bridge.stop(screenSessionId).catch(() => undefined);
      return { active: false, warning: null };
    }
    const refreshDelay = Math.max(30_000, Date.parse(credentials.refreshAfter) - Date.now());
    console.info("Screen audio lease acquired", {
      expiresAt: credentials.expiresAt,
      refreshAfter: credentials.refreshAfter,
    });
    scheduleRefresh(request, operation, refreshDelay);
    return { active: true, warning: null };
  }, [chatId, scheduleRefresh, stopResources, token]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  const toggle = useCallback(async (
    room: Room,
    sharing: boolean,
    processId: number | null,
    quality: ScreenShareQuality,
  ) => {
    if (sharing) {
      const stopping = stop();
      await room.localParticipant.setScreenShareEnabled(
        false,
        getScreenShareCaptureOptions(quality),
      );
      await stopping;
      return { enabled: false, hasAudio: false, warning: null };
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;
    await stopResources();
    if (operationRef.current !== operation) {
      return { enabled: false, hasAudio: false, warning: null };
    }
    const bridge = getDesktopProcessAudioBridge();
    const sourceRefresh = bridge && nativePublisherSupportedRef.current
      ? bridge.listSources().catch(() => sourcesRef.current)
      : Promise.resolve(sourcesRef.current);
    let resolvedProcessId = processId ?? automaticProcessIdRef.current;
    const nativeSources = bridge && nativePublisherSupportedRef.current
      ? await bridge.listCaptureSources().catch(() => [])
      : [];
    if (bridge && nativePublisherSupportedRef.current && nativeSources.length) {
      const selected = await requestCaptureSource(nativeSources);
      if (!selected) return { enabled: false, hasAudio: false, warning: null };
      if (operationRef.current !== operation) {
        return { enabled: false, hasAudio: false, warning: null };
      }
      const sources = await sourceRefresh;
      sourcesRef.current = sources;
      resolvedProcessId = selected.kind === "screen"
        ? null
        : resolveDesktopProcessAudioSource(
            sources,
            processId ?? selected.processId,
            selected.title,
          );
      const request = { processId: resolvedProcessId, captureSource: selected, quality };
      const result = await start(request, operation);
      const hasAudio = (selected.kind === "screen" || resolvedProcessId !== null)
        && result.active
        && result.warning === null;
      return {
        enabled: result.active,
        hasAudio,
        warning: result.warning ?? (result.active && !hasAudio
          ? "Окно передаётся без звука: приложение пока не создало доступную аудиосессию."
          : null),
      };
    }

    // Web and desktop fallback must call getDisplayMedia directly from the
    // click task so Chromium keeps transient user activation.
    let browserAudioCaptured = false;
    browserAudioCaptured = await startBrowserCapture(room, quality);
    const publication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    const enabled = Boolean(publication && !publication.isMuted);
    if (!enabled) return { enabled: false, hasAudio: false, warning: null };
    try {
      const surfaceAudio = room.localParticipant.getTrackPublication(Track.Source.ScreenShareAudio);
      return {
        enabled: true,
        hasAudio: browserAudioCaptured && Boolean(surfaceAudio && !surfaceAudio.isMuted),
        warning: browserAudioCaptured && surfaceAudio && !surfaceAudio.isMuted
          ? null
          : "Видео запущено без звука: браузер не передал аудиодорожку выбранной поверхности. В окне выбора включите передачу звука.",
      };
    } catch (cause) {
      return {
        enabled: true,
        hasAudio: false,
        warning: cause instanceof Error
          ? `Видео запущено без звука приложения: ${cause.message}`
          : "Видео запущено без звука приложения.",
      };
    }
  }, [requestCaptureSource, start, startBrowserCapture, stop, stopResources]);

  useEffect(() => () => {
    pickerResolverRef.current?.(null);
    void stop();
  }, [stop]);
  return {
    stop,
    toggle,
    capturePicker,
    selectCaptureSource: (source: DesktopCaptureSource) => resolveCapturePicker(source),
    cancelCaptureSource: () => resolveCapturePicker(null),
    pending: token.isPending,
    error: token.error?.message ?? null,
  };
}
