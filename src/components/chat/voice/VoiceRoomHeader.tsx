"use client";

import type { ReactNode } from "react";
import {
  Loader2,
  Lock,
  LockOpen,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Music2,
  Settings2,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ConnectionQuality } from "livekit-client";

import { IconButton } from "@/components/ui/IconButton";
import { getQualityLabel } from "./voice-room-config";
import type {
  VoiceRoomAccessModel,
  VoiceRoomConnectionModel,
  VoiceRoomIdentityModel,
} from "./voice-room-sheet-models";

type VoiceRoomHeaderProps = {
  identity: VoiceRoomIdentityModel;
  connection: VoiceRoomConnectionModel;
  participantCount: number;
  hasGroupSounds: boolean;
  hasRoomMessages: boolean;
  roomMessagesOpen: boolean;
  access: VoiceRoomAccessModel;
  fullscreen: boolean;
  fullscreenPending: boolean;
  onOpenSoundboard: () => void;
  onToggleRoomMessages: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void | Promise<void>;
};

export function VoiceRoomHeader({
  identity,
  connection,
  participantCount,
  hasGroupSounds,
  hasRoomMessages,
  roomMessagesOpen,
  access,
  fullscreen,
  fullscreenPending,
  onOpenSoundboard,
  onToggleRoomMessages,
  onOpenSettings,
  onToggleFullscreen,
}: VoiceRoomHeaderProps) {
  const weakConnection =
    connection.quality === ConnectionQuality.Poor ||
    connection.quality === ConnectionQuality.Lost;

  return (
    <header className="voople-full-room__header flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-3 pr-14">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="voople-full-room__title truncate text-base font-semibold uppercase tracking-[0.05em] sm:text-lg">{identity.chatName}</h2>
          {identity.durationLabel ? (
            <span className="shrink-0 text-xs tabular-nums text-[var(--app-muted)]">
              {identity.durationLabel}
            </span>
          ) : null}
        </div>
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
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {getQualityLabel(connection.quality)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="voople-full-room__header-actions flex shrink-0 items-center gap-1">
        {!identity.isDirect && identity.active && hasRoomMessages ? (
          <HeaderButton
            label={roomMessagesOpen ? "Закрыть сообщения комнаты" : "Открыть сообщения комнаты"}
            onClick={onToggleRoomMessages}
          >
            <MessageSquareText className="h-4 w-4" />
          </HeaderButton>
        ) : null}
        {!identity.isDirect && identity.active && hasGroupSounds ? (
          <HeaderButton label="Открыть звуки группы" onClick={onOpenSoundboard}>
            <Music2 className="h-4 w-4" />
          </HeaderButton>
        ) : null}
        {access.canManage ? (
          <HeaderButton
            label={access.mode === "locked" ? "Открыть свободный вход" : "Закрыть свободный вход"}
            disabled={access.pending}
            onClick={access.onToggle}
          >
            {access.mode === "locked" ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
          </HeaderButton>
        ) : null}
        <HeaderButton label="Настройки звука и соединения" onClick={onOpenSettings}>
          <Settings2 className="h-4 w-4" />
        </HeaderButton>
        <HeaderButton
          label={fullscreen ? "Выйти из полноэкранного режима" : "Открыть разговор на весь экран"}
          disabled={fullscreenPending}
          onClick={() => void onToggleFullscreen()}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </HeaderButton>
      </div>
    </header>
  );
}

function HeaderButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-xl text-[var(--foreground)] opacity-70 transition hover:bg-[var(--app-surface-soft)] hover:opacity-100 disabled:cursor-wait disabled:opacity-35"
    >
      {children}
    </IconButton>
  );
}
