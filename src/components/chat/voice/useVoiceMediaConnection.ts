"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { ConnectionQuality, ConnectionState, Room } from "livekit-client";

import { syncVoiceTrackProcessor } from "@/lib/livekit/rnnoise-track-processor";
import type { VoicePreferences } from "@/lib/livekit/voice-preferences";

import {
  getAudioCaptureOptions,
  getMicrophoneMuted,
  reconnectPolicy,
  VOICE_PUBLISH_OPTIONS,
  type LiveKitEndpoint,
  type MediaStatus,
  type ScreenShareQuality,
} from "./voice-room-config";

type VoiceMediaCredentials =
  | {
      enabled: false;
      screenShareQuality: ScreenShareQuality;
      expiresAt: null;
      refreshAfter: null;
    }
  | {
      enabled: true;
      url: string;
      endpoints: LiveKitEndpoint[];
      token: string;
      screenShareQuality: ScreenShareQuality;
      expiresAt: string;
      refreshAfter: string;
    };

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
  roomRef: MutableRefObject<Room | null>;
  preferencesRef: MutableRefObject<VoicePreferences>;
  desiredMicMutedRef: MutableRefObject<boolean>;
  screenShareQualityRef: MutableRefObject<ScreenShareQuality>;
  getCredentials: () => Promise<VoiceMediaCredentials>;
  configureRoom: (room: Room) => void;
  syncExistingPublications: (room: Room) => void;
  clearAttachedMedia: () => void;
  refreshDevices: () => Promise<void>;
  stopDesktopScreenAudio: () => Promise<void>;
  cancelRecovery: () => void;
  resetRecovery: () => void;
  setMicMuted: (muted: boolean) => void;
  setMediaStatus: (status: MediaStatus) => void;
  setMediaError: (message: string | null) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setAudioBlocked: (blocked: boolean) => void;
}) {
  const [endpoints, setEndpoints] = useState<LiveKitEndpoint[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
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
  }, [cancelRecovery, clearAttachedMedia, roomRef, setConnectionQuality, setMediaStatus, setMicMuted, stopDesktopScreenAudio]);

  const connect = async () => {
    const current = roomRef.current;
    if (
      current &&
      [ConnectionState.Connected, ConnectionState.Reconnecting, ConnectionState.Connecting].includes(current.state)
    ) return;
    if (connectPromiseRef.current) return connectPromiseRef.current;

    const sequence = ++sequenceRef.current;
    const task = (async () => {
      setMediaStatus("connecting");
      setMediaError(null);
      try {
        const credentials = await getCredentials();
        if (!credentials.enabled) {
          setMediaStatus("unavailable");
          return;
        }
        console.info("Voice media lease acquired", {
          expiresAt: credentials.expiresAt,
          refreshAfter: credentials.refreshAfter,
          endpointCount: credentials.endpoints?.length ?? 1,
        });
        screenShareQualityRef.current = credentials.screenShareQuality;
        const availableEndpoints = credentials.endpoints?.length
          ? credentials.endpoints
          : [{ url: credentials.url, label: "Авто" }];
        setEndpoints(availableEndpoints);
        const preferredUrl = preferencesRef.current.endpointUrl;
        const orderedEndpoints = preferredUrl === "auto"
          ? availableEndpoints
          : [
              ...availableEndpoints.filter((endpoint) => endpoint.url === preferredUrl),
              ...availableEndpoints.filter((endpoint) => endpoint.url !== preferredUrl),
            ];

        let lastError: unknown;
        for (const endpoint of orderedEndpoints) {
          if (sequence !== sequenceRef.current || !mountedRef.current) return;
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
            await room.prepareConnection(endpoint.url, credentials.token);
            await room.connect(endpoint.url, credentials.token, {
              autoSubscribe: false,
              maxRetries: 3,
              websocketTimeout: 15_000,
              peerConnectionTimeout: 20_000,
              rtcConfig: preferencesRef.current.compatibilityMode
                ? { iceTransportPolicy: "relay" }
                : undefined,
            });
          } catch (cause) {
            lastError = cause;
            if (roomRef.current === room) roomRef.current = null;
            void room.disconnect();
            continue;
          }
          if (sequence !== sequenceRef.current || !mountedRef.current) {
            roomRef.current = null;
            void room.disconnect();
            return;
          }

          setCurrentEndpoint(endpoint.url);
          setMediaStatus("connected");
          resetRecovery();
          setConnectionQuality(room.localParticipant.connectionQuality);
          syncExistingPublications(room);
          await room.startAudio().catch(() => setAudioBlocked(true));
          if (preferencesRef.current.outputDeviceId !== "default") {
            await room.switchActiveDevice("audiooutput", preferencesRef.current.outputDeviceId).catch(() => undefined);
          }
          if (!desiredMicMutedRef.current) {
            try {
              await room.localParticipant.setMicrophoneEnabled(
                true,
                getAudioCaptureOptions(preferencesRef.current),
                VOICE_PUBLISH_OPTIONS,
              );
              const processorError = await syncVoiceTrackProcessor(room, {
                rnnoiseEnabled: preferencesRef.current.enhancedNoiseSuppression,
                microphoneGain: preferencesRef.current.microphoneGain,
              });
              if (processorError) setMediaError(processorError);
            } catch (cause) {
              setMediaError(
                cause instanceof Error && cause.message.includes("timed out")
                  ? "Сервер не подтвердил микрофон. Комната осталась подключена — повторите включение или используйте совместимый режим."
                  : cause instanceof Error ? cause.message : "Не удалось включить микрофон.",
              );
            }
          }
          setMicMuted(getMicrophoneMuted(room));
          await refreshDevices();
          return;
        }
        throw lastError ?? new Error("Нет доступного медиасервера");
      } catch (cause) {
        if (sequence !== sequenceRef.current || !mountedRef.current) return;
        setMicMuted(true);
        setMediaStatus("error");
        setMediaError(
          cause instanceof Error
            ? cause.message
            : "Не удалось подключить голос. Проверьте сеть или включите совместимый режим.",
        );
      }
    })();

    connectPromiseRef.current = task;
    try {
      await task;
    } finally {
      if (connectPromiseRef.current === task) connectPromiseRef.current = null;
    }
  };

  return { endpoints, currentEndpoint, connect, disconnect };
}
