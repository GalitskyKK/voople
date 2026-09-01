"use client";

import { useCallback } from "react";

import { roomJoinErrorMessage } from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoomTarget } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

export function useGroupNowMediaHandoff({
  onJoined,
}: {
  onJoined: (
    target: GroupNowRoomTarget,
    result: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
}) {
  const utils = trpc.useUtils();
  const mediaTokenMutation = trpc.chat.coreRoomMediaToken.useMutation();
  const leaveMutation = trpc.chat.coreLeaveRoom.useMutation();

  const connect = useCallback(async (
    target: GroupNowRoomTarget,
    result: GroupRoomJoinResult,
  ) => {
    try {
      const credentials = await mediaTokenMutation.mutateAsync({
        sessionId: result.sessionId,
      });
      if (!credentials.enabled) {
        throw new Error("Медиасервер для комнаты временно недоступен");
      }
      await onJoined(target, result, credentials);
    } catch (error) {
      let cleanupFailed = false;
      try {
        await leaveMutation.mutateAsync({ sessionId: result.sessionId });
      } catch {
        cleanupFailed = true;
      } finally {
        await utils.chat.coreGroupNow.invalidate({ groupId: target.groupId });
      }
      if (cleanupFailed) {
        throw new Error(`${roomJoinErrorMessage(error)}. Сессия завершится автоматически.`);
      }
      throw error;
    }
    await utils.chat.coreGroupNow.invalidate({ groupId: target.groupId });
  }, [leaveMutation, mediaTokenMutation, onJoined, utils.chat.coreGroupNow]);

  return {
    connect,
    pending: mediaTokenMutation.isPending || leaveMutation.isPending,
  };
}
