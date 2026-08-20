"use client";

import { useCallback, useEffect, useRef } from "react";
import { Track, type Room } from "livekit-client";

import { getDesktopProcessAudioBridge } from "@/lib/livekit/desktop-process-audio";
import { trpc } from "@/lib/trpc/client";
import {
  getScreenShareCaptureOptions,
  getScreenSharePublishOptions,
  type ScreenShareQuality,
} from "./voice-room-config";

export function useDesktopScreenAudioPublisher(chatId: string) {
  const token = trpc.chat.roomScreenAudioToken.useMutation();
  const sessionIdRef = useRef<string | null>(null);
  const nativePublisherSupportedRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);
  const startRef = useRef<(processId: number) => Promise<string | null>>(async () => null);

  const scheduleRefresh = useCallback((processId: number, delay: number) => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    const run = () => {
      void startRef.current(processId).catch((error) => {
        console.warn("Screen audio lease refresh failed", {
          message: error instanceof Error ? error.message : String(error),
          retryAfterMs: 30_000,
        });
        refreshTimerRef.current = window.setTimeout(run, 30_000);
      });
    };
    refreshTimerRef.current = window.setTimeout(run, delay);
  }, []);

  useEffect(() => {
    let active = true;
    const bridge = getDesktopProcessAudioBridge();
    if (bridge) {
      void bridge.capabilities().then((capabilities) => {
        if (active) nativePublisherSupportedRef.current = capabilities.publisherSupported;
      }).catch(() => {
        if (active) nativePublisherSupportedRef.current = false;
      });
    }
    return () => {
      active = false;
    };
  }, []);

  const stop = useCallback(async () => {
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    const bridge = getDesktopProcessAudioBridge();
    if (bridge && sessionId) await bridge.stop(sessionId).catch(() => undefined);
  }, []);

  const start = useCallback(async (processId: number | null) => {
    const bridge = getDesktopProcessAudioBridge();
    if (!bridge || processId === null) return null;
    const capabilities = await bridge.capabilities();
    if (!capabilities.publisherSupported) return "Демонстрация запущена без звука приложения: аудиомодуль недоступен в этой системе.";
    const screenSessionId = crypto.randomUUID();
    const credentials = await token.mutateAsync({ chatId, screenSessionId });
    await stop();
    await bridge.start({ processId, livekitUrl: credentials.url, token: credentials.token, screenSessionId });
    sessionIdRef.current = screenSessionId;
    const refreshDelay = Math.max(30_000, Date.parse(credentials.refreshAfter) - Date.now());
    console.info("Screen audio lease acquired", {
      expiresAt: credentials.expiresAt,
      refreshAfter: credentials.refreshAfter,
    });
    scheduleRefresh(processId, refreshDelay);
    return null;
  }, [chatId, scheduleRefresh, stop, token]);

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
      await room.localParticipant.setScreenShareEnabled(
        false,
        getScreenShareCaptureOptions(quality),
      );
      await stop();
      return { enabled: false, warning: null };
    }

    // Do not await IPC before getDisplayMedia: the browser requires the call to
    // retain transient activation from the user's click.
    void stop();
    const nativeProcessAudio =
      processId !== null && nativePublisherSupportedRef.current;
    const captureOptions = getScreenShareCaptureOptions(quality, nativeProcessAudio);
    await room.localParticipant.setScreenShareEnabled(
      true,
      captureOptions,
      getScreenSharePublishOptions(quality),
    );
    const publication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    const enabled = Boolean(publication && !publication.isMuted);
    if (!enabled) return { enabled: false, warning: null };
    try {
      if (nativeProcessAudio) {
        return { enabled: true, warning: await start(processId) };
      }
      const surfaceAudio = room.localParticipant.getTrackPublication(
        Track.Source.ScreenShareAudio,
      );
      return {
        enabled: true,
        warning: surfaceAudio && !surfaceAudio.isMuted
          ? null
          : "Видео запущено без звука: выбранная поверхность или WebView не предоставили аудиодорожку. Для звука выберите вкладку или окно с поддержкой аудио и разрешите его в системном диалоге.",
      };
    } catch (cause) {
      return {
        enabled: true,
        warning: cause instanceof Error
          ? `Видео запущено без звука приложения: ${cause.message}`
          : "Видео запущено без звука приложения.",
      };
    }
  }, [start, stop]);

  useEffect(() => () => { void stop(); }, [stop]);
  return { stop, toggle, pending: token.isPending, error: token.error?.message ?? null };
}
