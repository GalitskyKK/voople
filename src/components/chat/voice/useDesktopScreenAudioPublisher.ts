"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioPresets, Track, type Room } from "livekit-client";

import {
  getDesktopProcessAudioBridge,
  resolveDesktopProcessAudioSource,
  type DesktopCaptureSource,
  type DesktopProcessAudioSource,
} from "@/lib/livekit/desktop-process-audio";
import {
  getScreenShareCaptureOptions,
  getBrowserDisplayMediaOptions,
  getScreenSharePublishOptions,
  type ScreenShareQuality,
} from "./voice-room-config";
import {
  useScreenAudioToken,
  type ScreenAudioTokenTarget,
} from "./useScreenAudioToken";

type NativeCaptureRequest = {
  processId: number | null;
  captureSource: DesktopCaptureSource;
  quality: ScreenShareQuality;
};

type NativeStartResult = {
  active: boolean;
  warning: string | null;
};

type ActiveCapture =
  | { kind: "native"; sessionId: string }
  | { kind: "browser"; stream: MediaStream };

export function useDesktopScreenAudioPublisher(
  target: ScreenAudioTokenTarget,
  onNativeSessionChange: (screenSessionId: string | null) => void,
) {
  const screenAudioToken = useScreenAudioToken(target);
  const createScreenAudioToken = screenAudioToken.createToken;
  const nativePublisherSupportedRef = useRef(false);
  const automaticProcessIdRef = useRef<number | null>(null);
  const sourcesRef = useRef<DesktopProcessAudioSource[]>([]);
  const operationRef = useRef(0);
  const activeCaptureRef = useRef<ActiveCapture | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const pickerResolverRef = useRef<((source: DesktopCaptureSource | null) => void) | null>(null);
  const [capturePicker, setCapturePicker] = useState<DesktopCaptureSource[] | null>(null);

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

  const stopCurrent = useCallback((): Promise<void> => {
    if (stopPromiseRef.current) return stopPromiseRef.current;

    const current = activeCaptureRef.current;
    if (!current) return Promise.resolve();

    const promise = (async () => {
      if (current.kind === "native") {
        onNativeSessionChange(null);
        const bridge = getDesktopProcessAudioBridge();
        if (!bridge) {
          throw new Error("Нативный модуль демонстрации недоступен.");
        }

        // Do not clear ownership before Rust confirms that the worker exited
        // (or was forcibly terminated after its graceful deadline).
        await bridge.stop(current.sessionId);
      } else {
        current.stream.getTracks().forEach((track) => track.stop());
      }

      if (activeCaptureRef.current === current) {
        activeCaptureRef.current = null;
      }
    })();

    stopPromiseRef.current = promise;

    const clearStopPromise = () => {
      if (stopPromiseRef.current === promise) {
        stopPromiseRef.current = null;
      }
    };
    // Using finally() here would create a second rejecting promise with no
    // consumer when native teardown fails. Keep cleanup single-flight without
    // introducing an unhandled rejection.
    void promise.then(clearStopPromise, clearStopPromise);

    return promise;
  }, [onNativeSessionChange]);

  const stop = useCallback(async () => {
    operationRef.current += 1;
    await stopCurrent();
  }, [stopCurrent]);

  const startBrowserCapture = useCallback(async (
    room: Room,
    quality: ScreenShareQuality,
    operation: number,
  ) => {
    const stream = await navigator.mediaDevices.getDisplayMedia(
      getBrowserDisplayMediaOptions(quality),
    );

    if (operationRef.current !== operation) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (!videoTrack) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Выбранная поверхность не предоставила видеодорожку.");
    }

    const streamName = `screen-${crypto.randomUUID()}`;

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
      throw cause;
    }

    if (operationRef.current !== operation) {
      stream.getTracks().forEach((track) => track.stop());
      await room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
      return false;
    }

    activeCaptureRef.current = { kind: "browser", stream };

    videoTrack.addEventListener("ended", () => {
      audioTrack?.stop();

      if (
        activeCaptureRef.current?.kind === "browser"
        && activeCaptureRef.current.stream === stream
      ) {
        activeCaptureRef.current = null;
      }

      void room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
    }, { once: true });

    return Boolean(audioTrack);
  }, []);

  const start = useCallback(async (
    request: NativeCaptureRequest,
    operation: number,
  ): Promise<NativeStartResult> => {
    const bridge = getDesktopProcessAudioBridge();
    if (!bridge) {
      return {
        active: false,
        warning: "Нативный модуль демонстрации недоступен.",
      };
    }

    const capabilities = await bridge.capabilities();
    if (operationRef.current !== operation) {
      return { active: false, warning: null };
    }

    if (!capabilities.publisherSupported) {
      return {
        active: false,
        warning: "Нативный модуль демонстрации недоступен в этой системе.",
      };
    }

    const screenSessionId = crypto.randomUUID();
    const credentials = await createScreenAudioToken(screenSessionId);

    if (operationRef.current !== operation) {
      return { active: false, warning: null };
    }

    await stopCurrent();

    if (operationRef.current !== operation) {
      return { active: false, warning: null };
    }

    const plus = request.quality === "plus";
    const ownership: ActiveCapture = {
      kind: "native",
      sessionId: screenSessionId,
    };

    // Publish ownership BEFORE awaiting bridge.start().
    // If STOP arrives while Rust is still spawning/connecting the worker,
    // stopCurrent() can already address this UUID.
    activeCaptureRef.current = ownership;
    onNativeSessionChange(screenSessionId);

    try {
      await bridge.start({
        processId: request.processId,
        captureSource: {
          id: request.captureSource.id,
          kind: request.captureSource.kind,
        },
        captureWidth: plus ? 1920 : 1280,
        captureHeight: plus ? 1080 : 720,
        captureFrameRate: plus ? 60 : 30,
        livekitUrl: credentials.url,
        token: credentials.token,
        screenSessionId,
      });
    } catch (cause) {
      if (activeCaptureRef.current === ownership) {
        activeCaptureRef.current = null;
        onNativeSessionChange(null);
      }

      if (operationRef.current !== operation) {
        return { active: false, warning: null };
      }

      throw cause;
    }

    if (operationRef.current !== operation) {
      if (activeCaptureRef.current === ownership) {
        await bridge.stop(screenSessionId).catch(() => undefined);
        activeCaptureRef.current = null;
        onNativeSessionChange(null);
      }
      return { active: false, warning: null };
    }

    console.info("Native screen-share worker ready", {
      expiresAt: credentials.expiresAt,
      screenSessionId,
    });

    // IMPORTANT:
    // Do not restart the media pipeline at credentials.refreshAfter.
    // LiveKit handles token refresh for an established Room. If refreshAfter
    // represents an application-specific lease, renew that lease with a separate
    // backend mutation that does not stop/restart this worker.

    return { active: true, warning: null };
  }, [
    createScreenAudioToken,
    onNativeSessionChange,
    stopCurrent,
  ]);

  const toggle = useCallback(async (
    room: Room,
    sharing: boolean,
    processId: number | null,
    quality: ScreenShareQuality,
  ) => {
    if (sharing) {
      const kind = activeCaptureRef.current?.kind ?? null;

      const stopping = stop();

      if (kind === "native") {
        // The supervisor remains the teardown owner, while the presentation
        // state can turn off immediately. A subsequent START still waits for
        // stopCurrent() through its single-flight promise.
        void stopping.catch((error: unknown) => {
          console.error("Не удалось завершить нативную демонстрацию", error);
        });
        return { enabled: false, hasAudio: false, warning: null };
      }

      await stopping;

      if (kind === "browser") {
        await room.localParticipant.setScreenShareEnabled(
          false,
          getScreenShareCaptureOptions(quality),
        ).catch(() => undefined);
      }

      return { enabled: false, hasAudio: false, warning: null };
    }

    const operation = operationRef.current + 1;
    operationRef.current = operation;

    const previousKind = activeCaptureRef.current?.kind ?? null;
    await stopCurrent();

    if (previousKind === "browser") {
      await room.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
    }

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

    if (operationRef.current !== operation) {
      return { enabled: false, hasAudio: false, warning: null };
    }

    if (bridge && nativePublisherSupportedRef.current && nativeSources.length) {
      const selected = await requestCaptureSource(nativeSources);

      if (!selected) {
        return { enabled: false, hasAudio: false, warning: null };
      }

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

      const request = {
        processId: resolvedProcessId,
        captureSource: selected,
        quality,
      };

      const result = await start(request, operation);

      const hasAudio = (
        selected.kind === "screen"
        || resolvedProcessId !== null
      )
        && result.active
        && result.warning === null;

      return {
        enabled: result.active,
        hasAudio,
        warning: result.warning ?? (
          result.active && !hasAudio
            ? "Окно передаётся без звука: приложение пока не создало доступную аудиосессию."
            : null
        ),
      };
    }

    // Web fallback stays inside the JS LiveKit Room.
    const browserAudioCaptured = await startBrowserCapture(room, quality, operation);

    if (operationRef.current !== operation) {
      return { enabled: false, hasAudio: false, warning: null };
    }

    const publication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    const enabled = Boolean(publication && !publication.isMuted);

    if (!enabled) {
      return { enabled: false, hasAudio: false, warning: null };
    }

    try {
      const surfaceAudio =
        room.localParticipant.getTrackPublication(Track.Source.ScreenShareAudio);

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
  }, [
    requestCaptureSource,
    start,
    startBrowserCapture,
    stop,
    stopCurrent,
  ]);

  useEffect(() => () => {
    pickerResolverRef.current?.(null);
    void stop().catch((error) => {
      console.warn("Screen-share cleanup failed", error);
    });
  }, [stop]);

  return {
    stop,
    toggle,
    capturePicker,
    selectCaptureSource: (source: DesktopCaptureSource) => resolveCapturePicker(source),
    cancelCaptureSource: () => resolveCapturePicker(null),
    pending: screenAudioToken.pending,
    error: screenAudioToken.error,
  };
}
