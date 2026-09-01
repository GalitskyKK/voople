"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Room } from "livekit-client";

import { trpc } from "@/lib/trpc/client";

import { getMicrophoneMuted } from "./voice-room-config";

export type VoiceHeartbeatTarget =
  | { kind: "legacy"; chatId: string }
  | {
      kind: "core";
      sessionId: string;
      cameraEnabled: boolean;
      screenSharing: boolean;
    };

export function useVoiceHeartbeat(
  target: VoiceHeartbeatTarget,
  inside: boolean,
  roomRef: RefObject<Room | null>,
) {
  const { mutateAsync: sendLegacyHeartbeat } = trpc.chat.heartbeatRoom.useMutation();
  const { mutateAsync: sendCoreHeartbeat } = trpc.chat.coreHeartbeatRoom.useMutation();
  const pendingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const [activeHealth, setActiveHealth] = useState<"healthy" | "degraded">("healthy");
  const targetKind = target.kind;
  const chatId = target.kind === "legacy" ? target.chatId : null;
  const sessionId = target.kind === "core" ? target.sessionId : null;
  const cameraEnabled = target.kind === "core" ? target.cameraEnabled : false;
  const screenSharing = target.kind === "core" ? target.screenSharing : false;

  const sendHeartbeat = useCallback(async () => {
    if (!inside || pendingRef.current) return;
    pendingRef.current = true;
    try {
      const micMuted = getMicrophoneMuted(roomRef.current);
      if (targetKind === "core" && sessionId) {
        await sendCoreHeartbeat({
          sessionId,
          micMuted,
          cameraEnabled,
          screenSharing,
        });
      } else if (chatId) {
        await sendLegacyHeartbeat({ chatId, micMuted });
      } else {
        throw new Error("Heartbeat target is unavailable");
      }
      consecutiveFailuresRef.current = 0;
      setActiveHealth("healthy");
    } catch (error) {
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current >= 2) setActiveHealth("degraded");
      console.error("Room heartbeat failed", {
        kind: targetKind,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      pendingRef.current = false;
    }
  }, [cameraEnabled, chatId, inside, roomRef, screenSharing, sendCoreHeartbeat, sendLegacyHeartbeat, sessionId, targetKind]);

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
