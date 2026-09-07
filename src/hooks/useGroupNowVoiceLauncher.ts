"use client";

import { useCallback } from "react";

import { useVoiceSession } from "@/components/chat/voice/VoiceSessionProvider";
import type { GroupNowRoom, GroupNowRoomTarget } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

export function useGroupNowVoiceLauncher({
  groupId,
  onRoomOpened,
}: {
  groupId: string;
  onRoomOpened?: () => void;
}) {
  const voice = useVoiceSession();

  const openLegacyRoom = useCallback((room: GroupNowRoom) => {
    if (room.joinTarget.kind !== "legacy") return;
    voice.openRoom({
      chatId: room.joinTarget.chatId,
      chatName: room.name,
      chatType: "group",
    });
    onRoomOpened?.();
  }, [onRoomOpened, voice]);

  const openJoinedRoom = useCallback((
    target: GroupNowRoomTarget,
    join: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => {
    voice.openCoreRoom({ groupId, room: target.room, join, credentials });
    onRoomOpened?.();
  }, [groupId, onRoomOpened, voice]);

  return { openJoinedRoom, openLegacyRoom, voice };
}
