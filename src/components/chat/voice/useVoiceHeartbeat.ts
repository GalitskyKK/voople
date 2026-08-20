"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Room } from "livekit-client";

import { trpc } from "@/lib/trpc/client";

import { getMicrophoneMuted } from "./voice-room-config";

export function useVoiceHeartbeat(
  chatId: string,
  inside: boolean,
  roomRef: RefObject<Room | null>,
) {
  const { mutateAsync } = trpc.chat.heartbeatRoom.useMutation();
  const pendingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const [activeHealth, setActiveHealth] = useState<"healthy" | "degraded">("healthy");

  const sendHeartbeat = useCallback(async () => {
    if (!inside || pendingRef.current) return;
    pendingRef.current = true;
    try {
      await mutateAsync({
        chatId,
        micMuted: getMicrophoneMuted(roomRef.current),
      });
      consecutiveFailuresRef.current = 0;
      setActiveHealth("healthy");
    } catch (error) {
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= 2) setActiveHealth("degraded");
      console.error("Room heartbeat failed", {
        chatId,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      pendingRef.current = false;
    }
  }, [chatId, inside, mutateAsync, roomRef]);

  useEffect(() => {
    if (!inside) {
      consecutiveFailuresRef.current = 0;
      return;
    }

    const onResume = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void sendHeartbeat();
      }
    };

    queueMicrotask(() => void sendHeartbeat());
    const timer = window.setInterval(() => void sendHeartbeat(), 25_000);
    window.addEventListener("online", onResume);
    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onResume);
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [inside, sendHeartbeat]);

  return { sendHeartbeat, health: inside ? activeHealth : "idle" };
}
