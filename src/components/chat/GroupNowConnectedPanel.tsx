"use client";

import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { GroupNowPanel } from "./GroupNowPanel";
import { GroupNowRoomSwitchDialog } from "./GroupNowRoomSwitchDialog";

export function GroupNowConnectedPanel({
  enabled = false,
  groupId,
  groupName,
  onJoined,
  onOpenLegacy,
  onCreateRoom,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  groupName: string;
  onJoined: (
    room: GroupNowRoom,
    result: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
  onOpenLegacy?: (room: GroupNowRoom) => void | Promise<void>;
  onCreateRoom?: () => void;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const join = useGroupNowRoomJoin({ groupId, onJoined, onOpenLegacy });

  return (
    <>
      <GroupNowPanel
        enabled={enabled}
        groupId={groupId}
        groupName={groupName}
        onJoinRoom={join.requestJoin}
        onCreateRoom={onCreateRoom}
        onOpenProfile={onOpenProfile}
      />
      <GroupNowRoomSwitchDialog
        room={join.confirmationRoom}
        pending={join.pending}
        error={join.confirmationError}
        onCancel={join.cancelSwitch}
        onConfirm={() => void join.confirmSwitch()}
      />
    </>
  );
}
