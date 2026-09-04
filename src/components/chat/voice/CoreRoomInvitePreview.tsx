"use client";

import { RoomInviteNotificationActions } from "@/components/notifications/RoomInviteNotificationActions";
import { useCoreRoomInvitePreview } from "@/hooks/useCoreRoomInvitePreview";

import { CoreRoomInvitePreviewView } from "./CoreRoomInvitePreviewView";

export function CoreRoomInvitePreview({ inviteId }: { inviteId: string }) {
  const { state, retry } = useCoreRoomInvitePreview(inviteId);
  return (
    <CoreRoomInvitePreviewView
      state={state}
      onRetry={retry}
      actions={state.kind === "ready" ? <RoomInviteNotificationActions invite={state.invite} /> : null}
    />
  );
}
