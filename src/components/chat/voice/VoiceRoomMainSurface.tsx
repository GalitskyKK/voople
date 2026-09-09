"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Sheet } from "@/components/ui/Sheet";
import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";

import { CoreRoomInvitePanel } from "./CoreRoomInvitePanel";
import { RoomMessagesPanel } from "./RoomMessagesPanel";
import { useVoiceRoomFullscreen } from "./useVoiceRoomFullscreen";
import type { VoiceRoomMainSurfaceProps } from "./voice-room-sheet-models";
import { VoiceRoomContent } from "./VoiceRoomContent";
import { VoiceRoomFooter } from "./VoiceRoomFooter";
import { VoiceRoomHeader } from "./VoiceRoomHeader";
import { VoiceRoomSwitchStatus } from "./VoiceRoomSwitchStatus";
import { VoiceRoomSwitcher } from "./VoiceRoomSwitcher";
import { VoiceSoundboardPanel } from "./VoiceSoundboardPanel";

type SecondaryPanel = "settings" | "soundboard" | "invite" | "messages" | null;

/** Full Room replaces route content while the global application sidebar remains mounted. */
export function VoiceRoomMainSurface({
  overlay: { open, onClose },
  identity,
  connection,
  stage,
  controls,
  access,
  session,
  roomSwitcher,
  messages,
  invite,
  settingsPanel,
}: VoiceRoomMainSurfaceProps) {
  const mounted = useIsClient();
  const surfaceRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanel>(null);
  const pendingRoom = roomSwitcher?.rooms.find(
    (room) => room.id === roomSwitcher.pendingRoomId,
  );
  const {
    fullscreen,
    pending: fullscreenPending,
    toggleFullscreen,
    exitFullscreen,
  } = useVoiceRoomFullscreen();

  const minimize = useCallback(() => {
    setSecondaryPanel(null);
    void exitFullscreen();
    onClose();
  }, [exitFullscreen, onClose]);

  useEffect(() => {
    if (!open) void exitFullscreen();
  }, [exitFullscreen, open]);

  useEffect(() => {
    if (!open) return;
    const activeElement = document.activeElement;
    returnFocusRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;
    const focusFrame = window.requestAnimationFrame(() => surfaceRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      const returnTarget = returnFocusRef.current;
      returnFocusRef.current = null;
      if (!returnTarget?.isConnected) return;
      window.requestAnimationFrame(() => {
        if (returnTarget.isConnected) returnTarget.focus({ preventScroll: true });
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open || fullscreen || secondaryPanel !== null) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      minimize();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [fullscreen, minimize, open, secondaryPanel]);

  if (!open || !mounted) return null;
  const mainArea = document.querySelector<HTMLElement>("[data-voople-main-area]");
  if (!mainArea) return null;

  return createPortal(
    <section
      ref={surfaceRef}
      data-voople-room-surface="full"
      role="region"
      aria-label={`Комната ${identity.chatName}`}
      tabIndex={-1}
      className={cn(
        "bg-[var(--background)] outline-none",
        fullscreen ? "fixed inset-0 z-[200]" : "absolute inset-0 z-[80]",
      )}
    >
      <div className="voople-full-room h-full min-h-0 w-full overflow-hidden border-0 shadow-none">
        <div className="voople-full-room__frame relative flex h-full min-h-0 min-w-0 max-sm:flex-col">
          {roomSwitcher ? <VoiceRoomSwitcher {...roomSwitcher} /> : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <VoiceRoomHeader
              identity={identity}
              connection={connection}
              participantCount={stage.participants.length}
              hasGroupSounds={stage.groupSounds.length > 0}
              hasRoomMessages={Boolean(messages)}
              roomMessagesOpen={secondaryPanel === "messages"}
              access={access}
              fullscreen={fullscreen}
              fullscreenPending={fullscreenPending}
              onMinimize={minimize}
              onOpenSoundboard={() => setSecondaryPanel("soundboard")}
              onToggleRoomMessages={() => setSecondaryPanel((current) => current === "messages" ? null : "messages")}
              onOpenSettings={() => setSecondaryPanel("settings")}
              onToggleFullscreen={toggleFullscreen}
            />
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <VoiceRoomContent
                identity={identity}
                stage={stage}
                controls={controls}
                session={session}
                errorMessage={connection.errorMessage}
                onInvite={invite ? () => setSecondaryPanel("invite") : undefined}
                onClose={minimize}
              />
              {pendingRoom ? <VoiceRoomSwitchStatus roomName={pendingRoom.name} /> : null}
            </div>
            <VoiceRoomFooter
              connection={connection}
              controls={controls}
              access={access}
              session={session}
            />
          </div>
          {messages && secondaryPanel === "messages" ? (
            <RoomMessagesPanel model={messages} onClose={() => setSecondaryPanel(null)} />
          ) : null}
        </div>
      </div>

      <Sheet
        open={secondaryPanel === "settings"}
        onClose={() => setSecondaryPanel(null)}
        className="max-w-xl"
        ariaLabel="Настройки звука и соединения"
      >
        <div className="mb-5 pr-10">
          <h3 className="text-xl font-semibold">Звук и соединение</h3>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Устройства, обработка голоса и маршрут медиасервера.
          </p>
        </div>
        {settingsPanel}
      </Sheet>
      <Sheet
        open={secondaryPanel === "soundboard"}
        onClose={() => setSecondaryPanel(null)}
        className="max-w-lg"
        ariaLabel="Звуки группы"
      >
        <div className="mb-5 pr-10">
          <h3 className="text-xl font-semibold">Звуки группы</h3>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Звук услышат все участники комнаты.
          </p>
        </div>
        <VoiceSoundboardPanel
          sounds={stage.groupSounds}
          onPlay={(sound) => {
            stage.onGroupSoundPlay(sound);
            setSecondaryPanel(null);
          }}
        />
      </Sheet>
      <Sheet
        open={secondaryPanel === "invite" && Boolean(invite)}
        onClose={() => setSecondaryPanel(null)}
        className="max-w-lg"
        ariaLabel="Пригласить участников в комнату"
      >
        {invite ? (
          <CoreRoomInvitePanel
            sessionId={invite.sessionId}
            enabled={secondaryPanel === "invite"}
          />
        ) : null}
      </Sheet>
    </section>,
    mainArea,
  );
}
