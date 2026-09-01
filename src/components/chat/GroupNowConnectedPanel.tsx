"use client";

import { useGroupNowRoomCreate } from "@/hooks/useGroupNowRoomCreate";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { GroupNowPanel } from "./GroupNowPanel";
import { GroupNowRoomCreateDialog } from "./GroupNowRoomCreateDialog";
import { GroupNowRoomSwitchDialog } from "./GroupNowRoomSwitchDialog";

export function GroupNowConnectedPanel({
  enabled = false,
  groupId,
  groupName,
  onJoined,
  onOpenLegacy,
  canCreatePinned = false,
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
  canCreatePinned?: boolean;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const join = useGroupNowRoomJoin({ groupId, onJoined, onOpenLegacy });
  const create = useGroupNowRoomCreate({ groupId, onJoined });

  return (
    <>
      <GroupNowPanel
        enabled={enabled}
        groupId={groupId}
        groupName={groupName}
        onJoinRoom={join.requestJoin}
        onCreateRoom={create.show}
        onOpenProfile={onOpenProfile}
      />
      <GroupNowRoomSwitchDialog
        room={join.confirmationRoom}
        pending={join.pending}
        error={join.confirmationError}
        onCancel={join.cancelSwitch}
        onConfirm={() => void join.confirmSwitch()}
      />
      <GroupNowRoomCreateDialog
        open={create.open}
        canCreatePinned={canCreatePinned}
        confirmation={create.confirmation}
        pending={create.pending}
        error={create.error}
        onClose={create.close}
        onBack={create.back}
        onConfirm={() => void create.confirm()}
        onSubmit={(draft) => void create.submit(draft)}
      />
    </>
  );
}
