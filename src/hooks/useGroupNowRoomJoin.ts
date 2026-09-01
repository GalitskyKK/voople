"use client";

import { useCallback, useState } from "react";

import {
  isCrossContextRoomJoinError,
  roomJoinErrorMessage,
} from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoom } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { useGroupNowMediaHandoff } from "./useGroupNowMediaHandoff";

export function useGroupNowRoomJoin({
  groupId,
  onJoined,
  onOpenLegacy,
}: {
  groupId: string;
  onJoined: (
    room: GroupNowRoom,
    result: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
  onOpenLegacy?: (room: GroupNowRoom) => void | Promise<void>;
}) {
  const joinMutation = trpc.chat.coreJoinRoom.useMutation();
  const mediaHandoff = useGroupNowMediaHandoff({ groupId, onJoined });
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
    await mediaHandoff.connect(room, result);
  }, [joinMutation, mediaHandoff, onOpenLegacy]);

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
    if (
      !room
      || joinMutation.isPending
      || mediaHandoff.pending
    ) return;
    setConfirmationError(null);
    try {
      await finishJoin(room, true);
      setConfirmationRoom(null);
    } catch (error) {
      setConfirmationError(roomJoinErrorMessage(error));
    }
  }, [confirmationRoom, finishJoin, joinMutation.isPending, mediaHandoff.pending]);

  const cancelSwitch = useCallback(() => {
    if (joinMutation.isPending || mediaHandoff.pending) return;
    setConfirmationError(null);
    setConfirmationRoom(null);
  }, [joinMutation.isPending, mediaHandoff.pending]);

  return {
    cancelSwitch,
    confirmationError,
    confirmationRoom,
    confirmSwitch,
    pending: joinMutation.isPending || mediaHandoff.pending,
    requestJoin,
  };
}
