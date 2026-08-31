"use client";

import { useCallback, useState } from "react";

import {
  isCrossContextRoomJoinError,
  roomJoinErrorMessage,
} from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoom } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";

export function useGroupNowRoomJoin({
  groupId,
  onJoined,
  onOpenLegacy,
}: {
  groupId: string;
  onJoined: (room: GroupNowRoom, result: GroupRoomJoinResult) => void | Promise<void>;
  onOpenLegacy?: (room: GroupNowRoom) => void | Promise<void>;
}) {
  const utils = trpc.useUtils();
  const joinMutation = trpc.chat.coreJoinRoom.useMutation();
  const leaveMutation = trpc.chat.coreLeaveRoom.useMutation();
  const [confirmationRoom, setConfirmationRoom] = useState<GroupNowRoom | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  const finishJoin = useCallback(async (room: GroupNowRoom, confirmedCrossContext: boolean) => {
    if (room.joinTarget.kind === "legacy") {
      if (!onOpenLegacy) throw new Error("Эта комната откроется в предыдущей версии интерфейса");
      await onOpenLegacy(room);
      return;
    }

    const result = await joinMutation.mutateAsync({
      roomId: room.joinTarget.roomId,
      micMuted: true,
      confirmedCrossContext,
    });
    try {
      await onJoined(room, result);
    } catch (error) {
      let cleanupFailed = false;
      try {
        await leaveMutation.mutateAsync({ sessionId: result.sessionId });
      } catch {
        cleanupFailed = true;
      } finally {
        await utils.chat.coreGroupNow.invalidate({ groupId });
      }
      if (cleanupFailed) {
        throw new Error(`${roomJoinErrorMessage(error)}. Сессия завершится автоматически.`);
      }
      throw error;
    }
    await utils.chat.coreGroupNow.invalidate({ groupId });
  }, [groupId, joinMutation, leaveMutation, onJoined, onOpenLegacy, utils.chat.coreGroupNow]);

  const requestJoin = useCallback(async (room: GroupNowRoom) => {
    setConfirmationError(null);
    try {
      await finishJoin(room, false);
    } catch (error) {
      if (room.joinTarget.kind === "room" && isCrossContextRoomJoinError(error)) {
        setConfirmationRoom(room);
        return;
      }
      throw error;
    }
  }, [finishJoin]);

  const confirmSwitch = useCallback(async () => {
    const room = confirmationRoom;
    if (!room || joinMutation.isPending || leaveMutation.isPending) return;
    setConfirmationError(null);
    try {
      await finishJoin(room, true);
      setConfirmationRoom(null);
    } catch (error) {
      setConfirmationError(roomJoinErrorMessage(error));
    }
  }, [confirmationRoom, finishJoin, joinMutation.isPending, leaveMutation.isPending]);

  const cancelSwitch = useCallback(() => {
    if (joinMutation.isPending || leaveMutation.isPending) return;
    setConfirmationError(null);
    setConfirmationRoom(null);
  }, [joinMutation.isPending, leaveMutation.isPending]);

  return {
    cancelSwitch,
    confirmationError,
    confirmationRoom,
    confirmSwitch,
    pending: joinMutation.isPending || leaveMutation.isPending,
    requestJoin,
  };
}
