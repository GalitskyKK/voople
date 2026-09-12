"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { roomGuestResponseJson } from "@/lib/chat/room-guest-client";
import type {
  RoomGuestInvitePreview,
  RoomGuestSessionIdentity,
  RoomGuestSessionSnapshot,
} from "@/types/room-guests";

import { useRoomGuestMedia } from "./useRoomGuestMedia";

type RoomGuestMediaRoots = {
  audioRootRef: RefObject<HTMLDivElement | null>;
  screenRootRef: RefObject<HTMLDivElement | null>;
};

export function useRoomGuestSession(token: string, mediaRoots: RoomGuestMediaRoots) {
  const [preview, setPreview] = useState<RoomGuestInvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [joined, setJoined] = useState<RoomGuestSessionIdentity | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const media = useRoomGuestMedia(mediaRoots);
  const joinRequestIdRef = useRef<string | null>(null);
  const restoreAttemptedRef = useRef(false);

  const loadPreview = useCallback(async (signal?: AbortSignal) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const response = await fetch(`/api/room-guests/invites/${encodeURIComponent(token)}`, {
        cache: "no-store",
        signal,
      });
      setPreview(await roomGuestResponseJson<RoomGuestInvitePreview>(response));
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

  const fetchSession = useCallback(async (allowMissing = false) => {
    const response = await fetch("/api/room-guests/session", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (allowMissing && (response.status === 401 || response.status === 410)) return null;
    return roomGuestResponseJson<RoomGuestSessionSnapshot>(response);
  }, []);

  const connectSession = useCallback(async (
    initialParticipantCount: number,
    allowMissing = false,
  ) => {
    setSessionError(null);
    try {
      const snapshot = await fetchSession(allowMissing);
      if (!snapshot) return null;
      setJoined(snapshot.guest);
      await media.connect(snapshot.media, Math.max(1, initialParticipantCount));
      return snapshot.guest;
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Не удалось подключиться к комнате");
      return null;
    }
  }, [fetchSession, media]);

  useEffect(() => {
    if (!preview?.available || joined || restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;
    void connectSession(preview.participantCount, true);
  }, [connectSession, joined, preview]);

  const join = useCallback(async (displayName: string) => {
    setSessionError(null);
    const normalizedName = displayName.trim().replace(/\s+/g, " ");
    const requestId = joinRequestIdRef.current ?? crypto.randomUUID();
    joinRequestIdRef.current = requestId;
    const result = await roomGuestResponseJson<RoomGuestSessionIdentity>(await fetch(
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
    await connectSession((preview?.participantCount ?? 0) + 1);
  }, [connectSession, preview?.participantCount, token]);

  const connect = useCallback(
    () => connectSession(media.participantCount || preview?.participantCount || 1),
    [connectSession, media.participantCount, preview?.participantCount],
  );

  const leave = useCallback(async () => {
    await media.disconnect();
    await fetch("/api/room-guests/session", {
      method: "DELETE",
      credentials: "same-origin",
    }).catch(() => undefined);
    setJoined(null);
    setSessionError(null);
    restoreAttemptedRef.current = false;
    await loadPreview();
  }, [loadPreview, media]);

  const prepareAccountConversion = useCallback(async () => {
    await media.disconnect();
  }, [media]);

  useEffect(() => {
    if (!joined || media.status !== "connected") return;
    const heartbeat = () => void fetch("/api/room-guests/session", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ micMuted: media.micMuted }),
    });
    const timer = window.setInterval(heartbeat, 20_000);
    return () => window.clearInterval(timer);
  }, [joined, media.micMuted, media.status]);

  return {
    preview,
    previewLoading,
    previewError,
    joined,
    mediaStatus: media.status,
    mediaError: sessionError ?? media.error,
    micError: media.micError,
    micMuted: media.micMuted,
    participantCount: media.participantCount,
    screenVisible: media.screenVisible,
    loadPreview,
    join,
    connect,
    toggleMicrophone: media.toggleMicrophone,
    leave,
    prepareAccountConversion,
  };
}
