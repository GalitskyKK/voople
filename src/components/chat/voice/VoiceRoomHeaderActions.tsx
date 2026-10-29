"use client";
import type { ReactNode } from "react";
import { Lock, LockOpen, Maximize, MessageSquareText, Minus, Minimize, Music2, Settings2, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { VoiceRoomHeaderProps } from "./VoiceRoomHeader";
import { VOICE_ROOM_CONTROL_CLASS } from "./voice-control-style";

export function VoiceRoomHeaderActions({identity, hasRoomMessages, roomMessagesOpen, hasGroupSounds, access, fullscreen, fullscreenPending, leavePending, canMinimizeToMini, onMinimizeToMini, onCloseToCompact, onToggleRoomMessages, onOpenSoundboard, onOpenSettings, onToggleFullscreen, placement = "header"}: VoiceRoomHeaderProps & { placement?: "header" | "corner-top" | "corner-bottom" | "toolbar" }) {
  const top = placement === "header" || placement === "corner-top";
  const toolbar = placement === "header" || placement === "toolbar";
  return (
      <div data-action-placement={placement} className="voople-full-room__header-actions flex shrink-0 items-center gap-1">
        {top && !identity.isDirect && identity.active && hasRoomMessages ? (
          <HeaderButton
            label={roomMessagesOpen ? "Закрыть чат группы" : "Открыть чат группы"}
            onClick={onToggleRoomMessages}
          >
            <MessageSquareText className="h-4 w-4" />
          </HeaderButton>
        ) : null}
        {top ? <HeaderButton label="Свернуть в мини" disabled={leavePending || !canMinimizeToMini} onClick={onMinimizeToMini}>
          <Minus className="h-4 w-4" />
        </HeaderButton> : null}
        {top ? <HeaderButton label="Закрыть окно комнаты" disabled={leavePending} onClick={onCloseToCompact}>
          <X className="h-4 w-4" />
        </HeaderButton> : null}
        {toolbar && !identity.isDirect && identity.active && hasGroupSounds ? (
          <HeaderButton label="Открыть звуки группы" onClick={onOpenSoundboard}>
            <Music2 className="h-4 w-4" />
          </HeaderButton>
        ) : null}
        {toolbar && access.canManage ? (
          <HeaderButton
            label={access.mode === "locked" ? "Открыть свободный вход" : "Закрыть свободный вход"}
            disabled={access.pending}
            onClick={access.onToggle}
          >
            {access.mode === "locked" ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
          </HeaderButton>
        ) : null}
        {toolbar ? <HeaderButton label="Настройки звука и соединения" onClick={onOpenSettings}>
          <Settings2 className="h-4 w-4" />
        </HeaderButton> : null}
        {placement === "header" || placement === "corner-bottom" ? <HeaderButton
          label={fullscreen ? "Выйти из полноэкранного режима" : "Открыть разговор на весь экран"}
          disabled={fullscreenPending}
          onClick={() => void onToggleFullscreen()}
        >
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </HeaderButton> : null}
      </div>
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
      className={VOICE_ROOM_CONTROL_CLASS}
    >
      {children}
    </IconButton>
  );
}
