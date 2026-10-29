"use client";

import { Loader2, Volume2, Wifi, WifiOff } from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { VoiceRoomHeaderActions } from "./VoiceRoomHeaderActions";
import { getQualityLabel } from "./voice-room-config";
import { VoiceRoomSelector } from "./VoiceRoomSelector";
import { VoiceRoomTitle } from "./VoiceRoomTitle";
import type {
  VoiceRoomAccessModel,
  VoiceRoomConnectionModel,
  VoiceRoomIdentityModel,
  VoiceRoomRenameModel,
  VoiceRoomSwitcherModel,
} from "./voice-room-sheet-models";

export type VoiceRoomHeaderProps = {
  identity: VoiceRoomIdentityModel;
  connection: VoiceRoomConnectionModel;
  participantCount: number;
  hasGroupSounds: boolean;
  hasRoomMessages: boolean;
  roomMessagesOpen: boolean;
  roomSwitcher: VoiceRoomSwitcherModel | null;
  roomRename: VoiceRoomRenameModel | null;
  access: VoiceRoomAccessModel;
  fullscreen: boolean;
  fullscreenPending: boolean;
  leavePending: boolean;
  canMinimizeToMini: boolean;
  onMinimizeToMini: () => void;
  onCloseToCompact: () => void;
  onOpenSoundboard: () => void;
  onToggleRoomMessages: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void | Promise<void>;
};

export function VoiceRoomHeader(props: VoiceRoomHeaderProps) {
  const { identity, connection, participantCount, roomSwitcher, roomRename } = props;
  const weakConnection =
    connection.quality === ConnectionQuality.Poor ||
    connection.quality === ConnectionQuality.Lost;

  return (
    <header className="voople-full-room__header flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-2">
      <div className="min-w-0 flex-1">
        <VoiceRoomTitle
          key={roomRename?.roomId ?? identity.chatName}
          title={identity.chatName}
          durationLabel={identity.durationLabel}
          rename={roomRename}
        />
        {roomSwitcher ? <VoiceRoomSelector model={roomSwitcher} /> : null}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--app-muted)]">
          <span>{identity.isDirect ? "Разговор вдвоём" : `${participantCount} в комнате`}</span>
          {connection.label ? (
            <span className="inline-flex items-center gap-1.5">
              {connection.status === "connecting" || connection.status === "reconnecting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {connection.label}
            </span>
          ) : null}
          {connection.status === "connected" ? (
            <span className="inline-flex items-center gap-1.5">
              {weakConnection ? (
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Wifi className="h-3.5 w-3.5 text-[var(--material-ice)]" />
              )}
              {getQualityLabel(connection.quality)}
            </span>
          ) : null}
        </div>
      </div>

      <VoiceRoomHeaderActions {...props} />
    </header>
  );
}
