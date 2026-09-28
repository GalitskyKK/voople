import type { GroupNowRoom } from "@/types/group-now";

import type { VoiceRoomRenameModel } from "./voice-room-sheet-models";

type RoomRenameAdapter = {
  supported: boolean;
  isPending: boolean;
  error: { message: string } | null;
  run: (name: string) => void | Promise<void>;
};

export function buildVoiceRoomRenameModel(
  room: GroupNowRoom | null,
  rename: RoomRenameAdapter,
  allowed: boolean,
): VoiceRoomRenameModel | null {
  if (!room || !rename.supported || !allowed || room.kind === "lobby") return null;
  return {
    roomId: room.id,
    name: room.name,
    pending: rename.isPending,
    errorMessage: rename.error?.message ?? null,
    onSubmit: rename.run,
  };
}
