"use client";

import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import { useGroupNowVoiceLauncher } from "@/hooks/useGroupNowVoiceLauncher";

import { GroupNowConnectedPanel } from "./GroupNowConnectedPanel";

export function GroupNowVoicePanel({
  enabled = false,
  groupId,
  groupName,
  variant = "surface",
  canCreatePinned = false,
  onRoomOpened,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  groupName: string;
  variant?: "surface" | "shelf";
  canCreatePinned?: boolean;
  onRoomOpened?: () => void;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const launcher = useGroupNowVoiceLauncher({ groupId, onRoomOpened });

  const openLegacy = (room: GroupNowRoom) => {
    launcher.openLegacyRoom(room);
  };

  return (
    <GroupNowConnectedPanel
      enabled={enabled}
      groupId={groupId}
      groupName={groupName}
      variant={variant}
      canCreatePinned={canCreatePinned}
      onOpenLegacy={openLegacy}
      onOpenProfile={onOpenProfile}
      onJoined={(room, join, credentials) => launcher.openJoinedRoom(
        { groupId, room },
        join,
        credentials,
      )}
    />
  );
}
