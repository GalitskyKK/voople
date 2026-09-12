"use client";

import { Room, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import {
  reconnectPolicy,
  VOICE_PUBLISH_OPTIONS,
} from "@/components/chat/voice/voice-room-config";
import { roomGuestMicrophoneError } from "@/lib/chat/room-guest-client";
import type { VoiceMediaCredentials } from "@/types/voice";

export function useRoomGuestMedia({
  audioRootRef,
  screenRootRef,
}: {
  audioRootRef: RefObject<HTMLDivElement | null>;
  screenRootRef: RefObject<HTMLDivElement | null>;
}) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "unavailable" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [screenVisible, setScreenVisible] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const manualDisconnectRef = useRef(false);

  const clear = useCallback(() => {
    audioRootRef.current?.replaceChildren();
    screenRootRef.current?.replaceChildren();
    setScreenVisible(false);
  }, [audioRootRef, screenRootRef]);

  const connect = useCallback(async (
    credentials: VoiceMediaCredentials,
    initialParticipantCount: number,
  ) => {
    if (roomRef.current) return true;
    setStatus("connecting");
    setError(null);
    setParticipantCount(initialParticipantCount);
    if (!credentials.enabled) {
      setStatus("unavailable");
      return true;
    }
    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        reconnectPolicy,
        disconnectOnPageLeave: true,
      });
      const syncCount = () => setParticipantCount(room.remoteParticipants.size + 1);
      room
        .on(RoomEvent.TrackSubscribed, (track, publication) => {
          if (track.kind === Track.Kind.Audio) {
            const element = track.attach();
            element.autoplay = true;
            audioRootRef.current?.appendChild(element);
          } else if (publication.source === Track.Source.ScreenShare) {
            const element = track.attach() as HTMLVideoElement;
            element.autoplay = true;
            element.playsInline = true;
            element.className = "h-full w-full object-contain";
            screenRootRef.current?.replaceChildren(element);
            setScreenVisible(true);
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track, publication) => {
          track.detach().forEach((element) => element.remove());
          if (publication.source === Track.Source.ScreenShare) setScreenVisible(false);
        })
        .on(RoomEvent.ParticipantConnected, syncCount)
        .on(RoomEvent.ParticipantDisconnected, syncCount)
        .on(RoomEvent.Reconnecting, () => setStatus("reconnecting"))
        .on(RoomEvent.Reconnected, () => setStatus("connected"))
        .on(RoomEvent.Disconnected, () => {
          roomRef.current = null;
          clear();
          if (!manualDisconnectRef.current) {
            setStatus("error");
            setError("Соединение прервано. Попробуйте подключиться снова.");
          }
        });
      roomRef.current = room;
      await room.connect(credentials.url, credentials.token, { autoSubscribe: true });
      await room.startAudio().catch(() => undefined);
      syncCount();
      setStatus("connected");
      return true;
    } catch (connectError) {
      roomRef.current = null;
      clear();
      setStatus("error");
      setError(connectError instanceof Error ? connectError.message : "Не удалось подключиться к комнате");
      return false;
    }
  }, [audioRootRef, clear, screenRootRef]);

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room || status !== "connected") return;
    const nextMuted = !micMuted;
    setMicError(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextMuted, undefined, VOICE_PUBLISH_OPTIONS);
      setMicMuted(nextMuted);
      await fetch("/api/room-guests/session", {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ micMuted: nextMuted }),
      }).catch(() => undefined);
    } catch (toggleError) {
      setMicError(roomGuestMicrophoneError(toggleError));
    }
  }, [micMuted, status]);

  const disconnect = useCallback(async () => {
    manualDisconnectRef.current = true;
    const room = roomRef.current;
    roomRef.current = null;
    await room?.disconnect();
    clear();
    setMicMuted(true);
    setMicError(null);
    setStatus("idle");
    manualDisconnectRef.current = false;
  }, [clear]);

  useEffect(() => () => {
    manualDisconnectRef.current = true;
    void roomRef.current?.disconnect();
  }, []);

  return {
    connect,
    disconnect,
    error,
    micError,
    micMuted,
    participantCount,
    screenVisible,
    status,
    toggleMicrophone,
  };
}
