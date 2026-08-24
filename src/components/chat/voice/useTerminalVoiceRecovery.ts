"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { ConnectionState, type DisconnectReason, type Room } from "livekit-client";

import { reportProductEvent } from "@/lib/telemetry/client";
import type { MediaStatus } from "./voice-room-config";

type RecoveryOptions = {
  chatId: string;
  inside: boolean;
  roomRef: RefObject<Room | null>;
  clearAttachedMedia: () => void;
  setMicMuted: (value: boolean) => void;
  setMediaStatus: (status: MediaStatus) => void;
  setMediaError: (message: string | null) => void;
};

export function useTerminalVoiceRecovery(options: RecoveryOptions) {
  const insideRef = useRef(options.inside);
  const mountedRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const connectMediaRef = useRef<(() => Promise<void>) | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
    insideRef.current = options.inside;
  }, [options]);

  const cancelRecovery = useCallback(() => {
    attemptsRef.current = 0;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const resetRecovery = useCallback(() => {
    cancelRecovery();
  }, [cancelRecovery]);

  const setConnectMedia = useCallback((connectMedia: () => Promise<void>) => {
    connectMediaRef.current = connectMedia;
  }, []);

  const handleDisconnected = useCallback((liveRoom: Room, reason?: DisconnectReason) => {
    const current = optionsRef.current;
    if (current.roomRef.current !== liveRoom) return;
    current.roomRef.current = null;
    current.clearAttachedMedia();
    current.setMicMuted(true);
    console.warn("Voice media connection ended", {
      chatId: current.chatId,
      reason: String(reason ?? "unknown"),
      attempt: attemptsRef.current,
    });
    if (!insideRef.current || !mountedRef.current) {
      current.setMediaStatus("idle");
      return;
    }

    current.setMediaStatus("reconnecting");
    current.setMediaError("Соединение прервалось. Voople автоматически восстанавливает связь…");
    reportProductEvent("voice_reconnect", { reason: String(reason ?? "unknown") });

    const retry = async () => {
      const latest = optionsRef.current;
      if (!insideRef.current || !mountedRef.current || latest.roomRef.current) return;
      const attempt = attemptsRef.current;
      if (attempt >= 5) {
        latest.setMediaStatus("error");
        reportProductEvent("voice_reconnect_failed", { attempts: attempt });
        latest.setMediaError("Не удалось восстановить связь автоматически. Проверьте сеть и подключитесь снова.");
        return;
      }
      attemptsRef.current = attempt + 1;
      const delay = [0, 1_000, 3_000, 7_000, 15_000][attempt] ?? 15_000;
      timerRef.current = window.setTimeout(async () => {
        timerRef.current = null;
        await connectMediaRef.current?.();
        if (optionsRef.current.roomRef.current?.state !== ConnectionState.Connected && insideRef.current) {
          void retry();
        }
      }, delay);
    };
    void retry();
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    cancelRecovery();
  }, [cancelRecovery]);

  return { setConnectMedia, handleDisconnected, resetRecovery, cancelRecovery };
}
