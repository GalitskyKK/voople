"use client";

import { useGroupNowRoomCreate } from "@/hooks/useGroupNowRoomCreate";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { GroupNowPanel } from "./GroupNowPanel";
import { GroupNowRoomCreateDialog } from "./GroupNowRoomCreateDialog";
import { GroupNowSplitPicker } from "./GroupNowSplitPicker";
import { GroupNowRoomSwitchDialog } from "./GroupNowRoomSwitchDialog";

export function GroupNowConnectedPanel({
  enabled = false,
  groupId,
  groupName,
  variant = "surface",
  onJoined,
  onOpenLegacy,
  currentSessionId,
  onLeaveCurrent,
  onExpandCurrent,
  leavePending = false,
  canCreatePinned = false,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  groupName: string;
  variant?: "surface" | "shelf";
  onJoined: (
    room: GroupNowRoom,
    result: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
  onOpenLegacy?: (room: GroupNowRoom) => void | Promise<void>;
  currentSessionId?: string | null;
  onLeaveCurrent?: (room: GroupNowRoom) => void | Promise<void>;
  onExpandCurrent?: () => void;
  leavePending?: boolean;
  canCreatePinned?: boolean;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const join = useGroupNowRoomJoin({
    onJoined: (target, result, credentials) => onJoined(target.room, result, credentials),
    onOpenLegacy: onOpenLegacy
      ? (target) => onOpenLegacy(target.room)
      : undefined,
  });
  const create = useGroupNowRoomCreate({ groupId, currentSessionId, onJoined });

  return (
    <>
      <GroupNowPanel
        enabled={enabled}
        groupId={groupId}
        groupName={groupName}
        variant={variant}
        onJoinRoom={(room) => join.requestJoin({ groupId, room })}
        onLeaveCurrent={onLeaveCurrent}
        onExpandCurrent={(room) => {
          if (currentSessionId === room.liveSessionId) onExpandCurrent?.();
          else join.requestJoin({ groupId, room });
        }}
        leavePending={leavePending}
        onCreateSplit={create.startSplit}
        onCreateRoom={canCreatePinned ? create.showRoom : undefined}
        createPending={create.pending}
        createError={create.error}
        onOpenProfile={onOpenProfile}
      />
      <GroupNowRoomSwitchDialog
        room={join.confirmationTarget?.room ?? null}
        pending={join.pending}
        error={join.confirmationError}
        onCancel={join.cancelSwitch}
        onConfirm={() => void join.confirmSwitch()}
      />
      <GroupNowRoomCreateDialog
        open={create.open}
        confirmation={create.confirmation}
        pending={create.pending}
        error={create.error}
        onClose={create.close}
        onBack={create.close}
        onConfirm={() => void create.confirm()}
        onSubmit={(draft) => void create.submit(draft)}
      />
      <GroupNowSplitPicker
        candidates={create.splitCandidates}
        pending={create.liveMove.pending}
        onClose={create.closeSplitPicker}
        onSubmit={create.submitSplit}
      />
      {create.liveMove.request && create.liveMove.status?.status === "pending" ? (
        <div className="fixed bottom-20 right-4 z-[80] flex max-w-sm items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm shadow-lg" role="status">
          <span>Ждём {create.liveMove.status.selectedCount - create.liveMove.status.acceptedCount} из {create.liveMove.status.selectedCount}</span>
          <button type="button" className="rounded-md px-2 py-1 text-[var(--theme-accent)] focus-visible:outline-2" disabled={create.liveMove.cancelPending} onClick={() => void create.liveMove.cancel()}>Отменить</button>
        </div>
      ) : null}
    </>
  );
}
