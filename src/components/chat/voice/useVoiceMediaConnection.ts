"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { ConnectionQuality, ConnectionState, Room } from "livekit-client";

import { syncVoiceTrackProcessor } from "@/lib/livekit/rnnoise-track-processor";
import type { VoicePreferences } from "@/lib/livekit/voice-preferences";
import type { VoiceMediaCredentials } from "@/types/voice";

import {
  getAudioCaptureOptions,
  getMicrophoneMuted,
  reconnectPolicy,
  VOICE_PUBLISH_OPTIONS,
  type LiveKitEndpoint,
  type MediaStatus,
  type ScreenShareQuality,
} from "./voice-room-config";
import {
  VOICE_MEDIA_CONNECTION_TIMEOUT_MS,
  VOICE_MEDIA_CREDENTIALS_TIMEOUT_MS,
  VOICE_MEDIA_ENDPOINT_TIMEOUT_MS,
  waitForVoiceMediaConnection,
} from "./voice-room-surface";

export function useVoiceMediaConnection({
  roomRef,
  preferencesRef,
  desiredMicMutedRef,
  screenShareQualityRef,
  getCredentials,
  configureRoom,
  syncExistingPublications,
  clearAttachedMedia,
  refreshDevices,
  stopDesktopScreenAudio,
  cancelRecovery,
  resetRecovery,
  setMicMuted,
  setMediaStatus,
  setMediaError,
  setConnectionQuality,
  setAudioBlocked,
}: {
  roomRef: MutableRefObject<Room | null>
  preferencesRef: MutableRefObject<VoicePreferences>
  desiredMicMutedRef: MutableRefObject<boolean>
  screenShareQualityRef: MutableRefObject<ScreenShareQuality>
  getCredentials: () => Promise<VoiceMediaCredentials>
  configureRoom: (room: Room) => void
  syncExistingPublications: (room: Room) => void
  clearAttachedMedia: () => void
  refreshDevices: () => Promise<void>
  stopDesktopScreenAudio: () => Promise<void>
  cancelRecovery: () => void
  resetRecovery: () => void
  setMicMuted: (muted: boolean) => void
  setMediaStatus: (status: MediaStatus) => void
  setMediaError: (message: string | null) => void
  setConnectionQuality: (quality: ConnectionQuality) => void
  setAudioBlocked: (blocked: boolean) => void;
}) {
  const [endpoints, setEndpoints] = useState<LiveKitEndpoint[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const connectPromiseRef = useRef<Promise<boolean> | null>(null);
  const sequenceRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
      cancelRecovery();
      const current = roomRef.current;
      roomRef.current = null;
      void stopDesktopScreenAudio();
      void current?.disconnect();
    };
  }, [cancelRecovery, roomRef, stopDesktopScreenAudio]);

  const disconnect = useCallback(() => {
    sequenceRef.current += 1;
    connectPromiseRef.current = null;
    cancelRecovery();
    const current = roomRef.current;
    roomRef.current = null;
    clearAttachedMedia();
    void stopDesktopScreenAudio();
    void current?.disconnect();
    setMicMuted(true);
    setMediaStatus("idle");
    setConnectionQuality(ConnectionQuality.Unknown);
    setCurrentEndpoint(null);
  }, [
    cancelRecovery,
    clearAttachedMedia,
    roomRef,
    setConnectionQuality,
    setMediaStatus,
    setMicMuted,
    stopDesktopScreenAudio,
  ]);

  const connect = async () => {
    if (connectPromiseRef.current) return connectPromiseRef.current;
    const current = roomRef.current;
    if (
      current &&
      [ConnectionState.Connected, ConnectionState.Reconnecting].includes(current.state)
    )
      return true;

    const sequence = ++sequenceRef.current;
    const task = (async () => {
      const isCurrent = () => sequence === sequenceRef.current && mountedRef.current;
      const deadlineAt = Date.now() + VOICE_MEDIA_CONNECTION_TIMEOUT_MS;

      const remainingTime = () => Math.max(0, deadlineAt - Date.now());
      const abandonRoom = (room: Room) => {
        if (roomRef.current === room) roomRef.current = null;
        void room.disconnect();
      };

      setMediaStatus("connecting");
      setMediaError(null);
      try {
        const credentialsTimeout = Math.min(
          VOICE_MEDIA_CREDENTIALS_TIMEOUT_MS,
          Math.max(1, remainingTime()),
        );

        const credentials = await waitForVoiceMediaConnection(
          getCredentials(),
          credentialsTimeout,
          "Сервер не выдал данные для голосового подключения вовремя.",
        );
        if (!isCurrent()) return false;
        if (!credentials.enabled) {
          setMediaStatus("unavailable");
          return false;
        }
        screenShareQualityRef.current = credentials.screenShareQuality;
        const availableEndpoints = credentials.endpoints?.length
          ? credentials.endpoints
          : [{ url: credentials.url, label: "Авто" }];
        setEndpoints(availableEndpoints);
        const preferredUrl = preferencesRef.current.endpointUrl;
        const orderedEndpoints =
          preferredUrl === "auto"
            ? availableEndpoints
            : [
                ...availableEndpoints.filter((endpoint) => endpoint.url === preferredUrl),
                ...availableEndpoints.filter((endpoint) => endpoint.url !== preferredUrl),
              ];

        let lastError: unknown;

        for (const endpoint of orderedEndpoints) {
          if (!isCurrent()) return false;
          if (remainingTime() <= 0) break;

          const room = new Room({
            adaptiveStream: true,
            dynacast: true,
            webAudioMix: true,
            reconnectPolicy,
            disconnectOnPageLeave: true,
            audioCaptureDefaults: getAudioCaptureOptions(preferencesRef.current),
            publishDefaults: { ...VOICE_PUBLISH_OPTIONS, stopMicTrackOnMute: false },
          });
          configureRoom(room);
          roomRef.current = room;

          try {
            const endpointTimeout = Math.min(
              VOICE_MEDIA_ENDPOINT_TIMEOUT_MS,
              Math.max(1, remainingTime()),
            );
            await waitForVoiceMediaConnection(
              room.connect(endpoint.url, credentials.token, {
                autoSubscribe: false,
                maxRetries: 2,
                websocketTimeout: 12_000,
                peerConnectionTimeout: 15_000,
                rtcConfig: preferencesRef.current.compatibilityMode
                  ? { iceTransportPolicy: "relay" }
                  : undefined,
              }),
              endpointTimeout,
              `Медиасервер «${endpoint.label}» не ответил вовремя.`,
            );
          } catch (cause) {
            lastError = cause;
            abandonRoom(room);
            continue;
          }

          if (!isCurrent()) {
            abandonRoom(room);
            return false;
          }

          setCurrentEndpoint(endpoint.url);
          setMediaStatus("connected");
          resetRecovery();
          setConnectionQuality(room.localParticipant.connectionQuality);

          try {
            syncExistingPublications(room);
          } catch {
            // Уже установленное LiveKit-соединение не должно
            // считаться failed из-за синхронизации публикаций.
          }

          setMicMuted(getMicrophoneMuted(room));

          const isCurrentRoom = () => isCurrent() && roomRef.current === room;

          void (async () => {
            try {
              await room.startAudio();

              if (isCurrentRoom()) {
                setAudioBlocked(false);
              }
            } catch {
              if (isCurrentRoom()) {
                setAudioBlocked(true);
              }
            }

            if (!isCurrentRoom()) return;

            const outputDeviceId = preferencesRef.current.outputDeviceId;

            if (outputDeviceId !== "default") {
              await room.switchActiveDevice("audiooutput", outputDeviceId).catch(() => undefined);
            }

            if (!isCurrentRoom()) return;

            if (!desiredMicMutedRef.current) {
              try {
                await room.localParticipant.setMicrophoneEnabled(
                  true,
                  getAudioCaptureOptions(preferencesRef.current),
                  VOICE_PUBLISH_OPTIONS,
                );

                if (!isCurrentRoom()) return;

                if (desiredMicMutedRef.current) {
                  await room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
                } else {
                  const processorError = await syncVoiceTrackProcessor(room, {
                    rnnoiseEnabled: preferencesRef.current.enhancedNoiseSuppression,
                    microphoneGain: preferencesRef.current.microphoneGain,
                  });

                  if (!isCurrentRoom()) return;

                  if (processorError) {
                    setMediaError(processorError);
                  }
                }
              } catch (cause) {
                if (!isCurrentRoom()) return;

                setMediaError(
                  cause instanceof Error && cause.message.includes("timed out")
                    ? "Сервер не подтвердил микрофон. Комната осталась подключена — повторите включение или используйте совместимый режим."
                    : cause instanceof Error
                      ? cause.message
                      : "Не удалось включить микрофон.",
                );
              }
            }

            if (!isCurrentRoom()) return;

            setMicMuted(getMicrophoneMuted(room));

            await refreshDevices().catch(() => undefined);

            if (!isCurrentRoom()) return;

            setMicMuted(getMicrophoneMuted(room));
          })();

          return true;
        }

        if (remainingTime() <= 0) {
          throw new Error(
            "Не удалось подключиться к голосовому серверу за 35 секунд. Повторите попытку или включите совместимый режим.",
          );
        }

        throw lastError ?? new Error("Нет доступного медиасервера");
      } catch (cause) {
        if (!isCurrent()) return false;
        setMicMuted(true);
        setMediaStatus("error");
        setMediaError(
          cause instanceof Error
            ? cause.message
            : "Не удалось подключить голос. Проверьте сеть или включите совместимый режим.",
        );
        return false;
      }
    })();

    connectPromiseRef.current = task;
    try {
      return await task;
    } finally {
      if (connectPromiseRef.current === task) connectPromiseRef.current = null;
    }
  };

  return { endpoints, currentEndpoint, connect, disconnect };
}
