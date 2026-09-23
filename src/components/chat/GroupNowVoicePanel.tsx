"use client";

import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import { useGroupNowVoiceLauncher } from "@/hooks/useGroupNowVoiceLauncher";
import { trpc } from "@/lib/trpc/client";

import { GroupNowConnectedPanel } from "./GroupNowConnectedPanel";

export function GroupNowVoicePanel({
  enabled = false,
  groupId,
  conversationId,
  groupName,
  variant = "surface",
  canCreatePinned = false,
  onRoomOpened,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  conversationId?: string;
  groupName: string;
  variant?: "surface" | "shelf";
  canCreatePinned?: boolean;
  onRoomOpened?: () => void;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const launcher = useGroupNowVoiceLauncher({ groupId, conversationId, onRoomOpened });
  const utils = trpc.useUtils();
  const leaveMutation = trpc.chat.coreLeaveRoom.useMutation();

  const openLegacy = (room: GroupNowRoom) => {
    launcher.openLegacyRoom(room);
  };

  const leaveCurrentRoom = async (room: GroupNowRoom) => {
    if (!room.liveSessionId) return;

    const activeCoreSession = launcher.voice.activeSession?.coreSession;
    const controlsThisRoom =
      launcher.voice.state.inside
      && activeCoreSession?.join.sessionId === room.liveSessionId;

    if (controlsThisRoom) {
      await launcher.voice.leaveRoom();
    } else {
      await leaveMutation.mutateAsync({ sessionId: room.liveSessionId });
    }

    await Promise.all([
      utils.chat.coreGroupNow.invalidate({ groupId }),
      utils.home.activeRooms.invalidate(),
    ]);
  };

  return (
    <GroupNowConnectedPanel
      enabled={enabled}
      groupId={groupId}
      groupName={groupName}
      variant={variant}
      canCreatePinned={canCreatePinned}
      onOpenLegacy={openLegacy}
      currentSessionId={launcher.voice.activeSession?.coreSession?.join.sessionId}
      onLeaveCurrent={leaveCurrentRoom}
      onExpandCurrent={launcher.voice.openPanel}
      leavePending={leaveMutation.isPending}
      onOpenProfile={onOpenProfile}
      onJoined={(room, join, credentials) => launcher.openJoinedRoom(
        { groupId, room },
        join,
        credentials,
      )}
    />
  );
}
