"use client";

import { useCallback, useState } from "react";

import {
  isCrossContextRoomJoinError,
  roomJoinErrorMessage,
} from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoomTarget } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { useGroupNowMediaHandoff } from "./useGroupNowMediaHandoff";

export function useGroupNowRoomJoin({
  onJoined,
  onOpenLegacy,
}: {
  onJoined: (
    target: GroupNowRoomTarget,
    result: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
  onOpenLegacy?: (target: GroupNowRoomTarget) => void | Promise<void>;
}) {
  const joinMutation = trpc.chat.coreJoinRoom.useMutation();
  const mediaHandoff = useGroupNowMediaHandoff({ onJoined });
  const [confirmationTarget, setConfirmationTarget] = useState<GroupNowRoomTarget | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  const finishJoin = useCallback(async (target: GroupNowRoomTarget, confirmedCrossContext: boolean) => {
    const { room } = target;
    if (room.joinTarget.kind === "legacy") {
      if (!onOpenLegacy) throw new Error("Эта комната откроется в предыдущей версии интерфейса");
      await onOpenLegacy(target);
      return;
    }

    const result = await joinMutation.mutateAsync({
      roomId: room.joinTarget.roomId,
      micMuted: true,
      confirmedCrossContext,
    });
    await mediaHandoff.connect(target, result);
  }, [joinMutation, mediaHandoff, onOpenLegacy]);

  const requestJoin = useCallback(async (target: GroupNowRoomTarget) => {
    setConfirmationError(null);
    try {
      await finishJoin(target, false);
    } catch (error) {
      if (target.room.joinTarget.kind === "room" && isCrossContextRoomJoinError(error)) {
        setConfirmationTarget(target);
        return;
      }
      throw error;
    }
  }, [finishJoin]);

  const confirmSwitch = useCallback(async () => {
    const target = confirmationTarget;
    if (
      !target
      || joinMutation.isPending
      || mediaHandoff.pending
    ) return;
    setConfirmationError(null);
    try {
      await finishJoin(target, true);
      setConfirmationTarget(null);
    } catch (error) {
      setConfirmationError(roomJoinErrorMessage(error));
    }
  }, [confirmationTarget, finishJoin, joinMutation.isPending, mediaHandoff.pending]);

  const cancelSwitch = useCallback(() => {
    if (joinMutation.isPending || mediaHandoff.pending) return;
    setConfirmationError(null);
    setConfirmationTarget(null);
  }, [joinMutation.isPending, mediaHandoff.pending]);

  return {
    cancelSwitch,
    confirmationError,
    confirmationTarget,
    confirmSwitch,
    pending: joinMutation.isPending || mediaHandoff.pending,
    requestJoin,
  };
}
