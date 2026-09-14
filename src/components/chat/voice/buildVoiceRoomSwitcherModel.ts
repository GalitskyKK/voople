import type { GroupNowRoom } from "@/types/group-now";

import type { VoiceRoomSwitcherModel } from "./voice-room-sheet-models";

type RoomDirectory = {
  rooms: GroupNowRoom[];
  error: { message: string } | null;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
};

type RoomActions = {
  supported: boolean;
  pendingRoomId: string | null;
  errorRoomId: string | null;
  error: { message: string } | null;
  rename: (roomId: string, name: string) => void | Promise<void>;
  setPinned: (roomId: string, pinned: boolean) => void | Promise<void>;
  archive: (roomId: string) => void | Promise<void>;
};

export function buildVoiceRoomSwitcherModel(
  currentRoomId: string | null,
  directory: RoomDirectory | null,
  enabled: boolean,
  pendingRoomId: string | null,
  switchError: string | null,
  onSelect: (room: GroupNowRoom) => void | Promise<void>,
  actions: RoomActions,
): VoiceRoomSwitcherModel | null {
  if (!enabled || !currentRoomId || !directory) return null;
  return {
    rooms: directory.rooms,
    currentRoomId,
    pendingRoomId,
    errorMessage: switchError ?? directory.error?.message ?? null,
    refreshing: directory.isFetching,
    onSelect,
    onRetry: async () => { await directory.refetch(); },
    management: actions.supported ? {
      pendingRoomId: actions.pendingRoomId,
      errorRoomId: actions.errorRoomId,
      errorMessage: actions.error?.message ?? null,
      onRename: actions.rename,
      onSetPinned: actions.setPinned,
      onArchive: actions.archive,
    } : null,
  };
}
