"use client";

import { Room, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { reconnectPolicy, VOICE_PUBLISH_OPTIONS } from "@/components/chat/voice/voice-room-config";
import type { RoomGuestInvitePreview, RoomGuestJoinResult } from "@/types/room-guests";
import type { VoiceMediaCredentials } from "@/types/voice";

type GuestMediaStatus = "idle" | "connecting" | "connected" | "reconnecting" | "unavailable" | "error";

async function responseJson<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error(value && typeof value === "object" && "error" in value && value.error
      ? String(value.error)
      : "Сервис комнаты временно недоступен");
  }
  return value as T;
}

type RoomGuestMediaRoots = {
  audioRootRef: RefObject<HTMLDivElement | null>;
  screenRootRef: RefObject<HTMLDivElement | null>;
};

export function useRoomGuestSession(token: string, mediaRoots: RoomGuestMediaRoots) {
  const { audioRootRef, screenRootRef } = mediaRoots;
  const [preview, setPreview] = useState<RoomGuestInvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [joined, setJoined] = useState<RoomGuestJoinResult | null>(null);
  const [mediaStatus, setMediaStatus] = useState<GuestMediaStatus>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [screenVisible, setScreenVisible] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const manualDisconnectRef = useRef(false);
  const joinRequestIdRef = useRef<string | null>(null);

  const loadPreview = useCallback(async (signal?: AbortSignal) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const response = await fetch(`/api/room-guests/invites/${encodeURIComponent(token)}`, {
        cache: "no-store",
        signal,
      });
      setPreview(await responseJson<RoomGuestInvitePreview>(response));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPreviewError(error instanceof Error ? error.message : "Не удалось проверить приглашение");
    } finally {
      if (!signal?.aborted) setPreviewLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadPreview(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadPreview]);

  const clearMedia = useCallback(() => {
    audioRootRef.current?.replaceChildren();
    screenRootRef.current?.replaceChildren();
    setScreenVisible(false);
  }, [audioRootRef, screenRootRef]);

  const connect = useCallback(async () => {
    if (roomRef.current) return;
    setMediaStatus("connecting");
    setMediaError(null);
    try {
      const credentials = await responseJson<VoiceMediaCredentials>(await fetch("/api/room-guests/session", {
        cache: "no-store",
        credentials: "same-origin",
      }));
      if (!credentials.enabled) {
        setMediaStatus("unavailable");
        return;
      }
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
        .on(RoomEvent.Reconnecting, () => setMediaStatus("reconnecting"))
        .on(RoomEvent.Reconnected, () => setMediaStatus("connected"))
        .on(RoomEvent.Disconnected, () => {
          roomRef.current = null;
          clearMedia();
          if (!manualDisconnectRef.current) {
            setMediaStatus("error");
            setMediaError("Соединение прервано. Попробуйте подключиться снова.");
          }
        });
      roomRef.current = room;
      await room.connect(credentials.url, credentials.token, { autoSubscribe: true });
      await room.startAudio().catch(() => undefined);
      syncCount();
      setMediaStatus("connected");
    } catch (error) {
      roomRef.current = null;
      clearMedia();
      setMediaStatus("error");
      setMediaError(error instanceof Error ? error.message : "Не удалось подключиться к комнате");
    }
  }, [audioRootRef, clearMedia, screenRootRef]);

  const join = useCallback(async (displayName: string) => {
    setMediaError(null);
    const normalizedName = displayName.trim().replace(/\s+/g, " ");
    const requestId = joinRequestIdRef.current ?? crypto.randomUUID();
    joinRequestIdRef.current = requestId;
    const result = await responseJson<RoomGuestJoinResult>(await fetch(
      `/api/room-guests/invites/${encodeURIComponent(token)}`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: normalizedName, requestId }),
      },
    ));
    joinRequestIdRef.current = null;
    setJoined(result);
    setParticipantCount((preview?.participantCount ?? 0) + 1);
    await connect();
  }, [connect, preview?.participantCount, token]);

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room || mediaStatus !== "connected") return;
    const nextMuted = !micMuted;
    await room.localParticipant.setMicrophoneEnabled(!nextMuted, undefined, VOICE_PUBLISH_OPTIONS);
    setMicMuted(nextMuted);
    await fetch("/api/room-guests/session", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ micMuted: nextMuted }),
    }).catch(() => undefined);
  }, [mediaStatus, micMuted]);

  const leave = useCallback(async () => {
    manualDisconnectRef.current = true;
    const room = roomRef.current;
    roomRef.current = null;
    await room?.disconnect();
    clearMedia();
    await fetch("/api/room-guests/session", {
      method: "DELETE",
      credentials: "same-origin",
    }).catch(() => undefined);
    setJoined(null);
    setMicMuted(true);
    setMediaStatus("idle");
    manualDisconnectRef.current = false;
    await loadPreview();
  }, [clearMedia, loadPreview]);

  useEffect(() => {
    if (!joined || mediaStatus !== "connected") return;
    const heartbeat = () => void fetch("/api/room-guests/session", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ micMuted }),
    });
    const timer = window.setInterval(heartbeat, 20_000);
    return () => window.clearInterval(timer);
  }, [joined, mediaStatus, micMuted]);

  useEffect(() => {
    if (!joined) return;
    const endGuestSession = () => {
      void fetch("/api/room-guests/session", {
        method: "DELETE",
        credentials: "same-origin",
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", endGuestSession);
    return () => window.removeEventListener("pagehide", endGuestSession);
  }, [joined]);

  useEffect(() => () => {
    manualDisconnectRef.current = true;
    void roomRef.current?.disconnect();
  }, []);

  return {
    preview,
    previewLoading,
    previewError,
    joined,
    mediaStatus,
    mediaError,
    micMuted,
    participantCount,
    screenVisible,
    loadPreview,
    join,
    connect,
    toggleMicrophone,
    leave,
  };
}
