"use client";

import { useState } from "react";

import type { GroupNowRoom, GroupNowRoomTarget } from "@/types/group-now";
import type { CoreVoiceSessionDescriptor } from "@/types/voice";

export function useCoreVoiceRoomSwitch(
  session: CoreVoiceSessionDescriptor | undefined,
  onSwitch: ((target: GroupNowRoomTarget) => void | Promise<void>) | undefined,
) {
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchRoom = async (room: GroupNowRoom) => {
    if (!session || !onSwitch || room.id === session.room.id || pendingRoomId) return;
    setErrorMessage(null);
    setPendingRoomId(room.id);
    try {
      await onSwitch({ groupId: session.groupId, room });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось перейти в комнату");
    } finally {
      setPendingRoomId(null);
    }
  };

  return { pendingRoomId, errorMessage, switchRoom };
}
