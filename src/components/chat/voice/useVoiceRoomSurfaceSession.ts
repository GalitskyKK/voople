"use client";

import { useCallback, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { reportProductEvent } from "@/lib/telemetry/client";

import {
  waitForVoiceRoomLifecycle,
  type VoiceRoomSessionTransition,
} from "./voice-room-surface";
import type { useVoiceMediaConnection } from "./useVoiceMediaConnection";
import type { useVoiceRoomServerSession } from "./useVoiceRoomServerSession";
import type { useVoiceSessionOperation } from "./useVoiceSessionOperation";

type SurfaceSessionOptions = {
  chatId: string;
  chatType: "direct" | "group";
  inside: boolean;
  active: boolean;
  startedAt: string | null;
  desiredMicMutedRef: MutableRefObject<boolean>;
  server: ReturnType<typeof useVoiceRoomServerSession>;
  mediaConnection: Pick<ReturnType<typeof useVoiceMediaConnection>, "connect" | "disconnect">;
  sessionOperation: ReturnType<typeof useVoiceSessionOperation>;
  setMediaError: Dispatch<SetStateAction<string | null>>;
};

/** Owns the optimistic Room surface phases and their server-confirmed recovery actions. */
export function useVoiceRoomSurfaceSession({
  chatId,
  chatType,
  inside,
  active,
  startedAt,
  desiredMicMutedRef,
  server,
  mediaConnection,
  sessionOperation,
  setMediaError,
}: SurfaceSessionOptions) {
  const [transition, setTransition] = useState<VoiceRoomSessionTransition>(null);
  const [failedOperation, setFailedOperation] = useState<"connect" | "leave" | null>(null);

  const resetSurface = useCallback(() => {
    setTransition(null);
    setFailedOperation(null);
  }, []);

  const enterAndConnect = () => sessionOperation.run(async ({ isCurrent }) => {
    setTransition("connecting");
    setFailedOperation(null);
    setMediaError(null);
    try {
      if (!inside) {
        const nextRoom = await server.enter.mutateAsync({
          chatId,
          micMuted: desiredMicMutedRef.current,
        });
        if (!isCurrent()) {
          await server.leave.mutateAsync({ chatId }).catch(() => undefined);
          return;
        }
        server.utils.chat.room.setData({ chatId }, nextRoom);
        if (!active) reportProductEvent("room_created", { kind: chatType });
      }
      if (!isCurrent()) return;
      await mediaConnection.connect();
      if (!isCurrent()) {
        mediaConnection.disconnect();
        return;
      }
      reportProductEvent("room_joined", { kind: chatType });
    } catch {
      if (isCurrent()) setFailedOperation("connect");
    } finally {
      if (isCurrent()) setTransition(null);
    }
  });

  const leaveRoom = async () => {
    setTransition("leaving");
    setFailedOperation(null);
    setMediaError(null);
    sessionOperation.cancel();
    mediaConnection.disconnect();
    try {
      await waitForVoiceRoomLifecycle((async () => {
        await server.leave.mutateAsync({ chatId });
        await server.room.refetch();
      })());
      setTransition("post-leave");
      reportProductEvent("room_left", {
        durationSeconds: startedAt
          ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1_000))
          : 0,
      });
    } catch (error) {
      setFailedOperation("leave");
      setMediaError(
        error instanceof Error
          ? error.message
          : "Не удалось подтвердить выход из комнаты",
      );
      setTransition(null);
    }
  };

  return {
    transition,
    failedOperation,
    resetSurface,
    enterAndConnect,
    leaveRoom,
  };
}
