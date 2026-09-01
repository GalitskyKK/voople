"use client";

import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";

import { useVoiceSession } from "./voice/VoiceSessionProvider";
import { GroupNowConnectedPanel } from "./GroupNowConnectedPanel";

export function GroupNowVoicePanel({
  enabled = false,
  groupId,
  groupName,
  canCreatePinned = false,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  groupName: string;
  canCreatePinned?: boolean;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const voice = useVoiceSession();

  const openLegacy = (room: GroupNowRoom) => {
    if (room.joinTarget.kind !== "legacy") return;
    voice.openRoom({
      chatId: room.joinTarget.chatId,
      chatName: room.name,
      chatType: "group",
    });
  };

  return (
    <GroupNowConnectedPanel
      enabled={enabled}
      groupId={groupId}
      groupName={groupName}
      canCreatePinned={canCreatePinned}
      onOpenLegacy={openLegacy}
      onOpenProfile={onOpenProfile}
      onJoined={(room, join, credentials) => voice.openCoreRoom({
        groupId,
        room,
        join,
        credentials,
      })}
    />
  );
}
