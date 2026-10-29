import { Volume2 } from "lucide-react";
import { VoiceRoomTitle } from "./VoiceRoomTitle";
import type { VoiceRoomIdentityModel, VoiceRoomRenameModel } from "./voice-room-sheet-models";

export function VoiceRoomChannelTitle({ identity, rename }: { identity: VoiceRoomIdentityModel; rename: VoiceRoomRenameModel | null }) {
  return <div className="voople-room-channel-title"><Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" /><VoiceRoomTitle title={identity.roomName ?? identity.chatName} durationLabel={null} rename={rename} /></div>;
}
