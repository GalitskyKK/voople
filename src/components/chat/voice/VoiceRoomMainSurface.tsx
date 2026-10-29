"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";

import { RoomMessagesPanel } from "./RoomMessagesPanel";
import { useVoiceRoomFullscreen } from "./useVoiceRoomFullscreen";
import { useVoiceRoomPlacement } from "./useVoiceRoomPlacement";
import type { VoiceRoomMainSurfaceProps } from "./voice-room-sheet-models";
import { VoiceRoomContent } from "./VoiceRoomContent";
import { VoiceRoomFooter } from "./VoiceRoomFooter";
import { VoiceRoomHeader, type VoiceRoomHeaderProps } from "./VoiceRoomHeader";
import { VoiceRoomHeaderActions } from "./VoiceRoomHeaderActions";
import { VoiceRoomChannelTitle } from "./VoiceRoomChannelTitle";
import { VoiceRoomSwitchStatus } from "./VoiceRoomSwitchStatus";
import { VoiceRoomSwitcher } from "./VoiceRoomSwitcher";
import { VoiceRoomPanels, type SecondaryPanel } from "./VoiceRoomPanels";


/** Full Room replaces route content while the global application sidebar remains mounted. */
export function VoiceRoomMainSurface({
  overlay: { open, onCloseToMini, onCloseToCompact },
  identity,
  connection,
  stage,
  controls,
  access,
  session,
  roomSwitcher,
  roomRename,
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
  const { main: mainArea, channel, orbitGroup, embedded, frame } = useVoiceRoomPlacement({ groupId: identity.groupId, open, fullscreen, onClose: onCloseToCompact });

  const closeSurface = useCallback((target: "mini" | "compact") => {
    if (session.leavePending) return;
    setSecondaryPanel((current) => current === "messages" ? current : null);
    void exitFullscreen();
    if (target === "mini") onCloseToMini();
    else onCloseToCompact();
  }, [exitFullscreen, onCloseToCompact, onCloseToMini, session.leavePending]);
  const closeRoomMessages = useCallback(() => {
    setSecondaryPanel(null);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(
        'button[aria-label="Открыть чат группы"]',
      )?.focus({ preventScroll: true });
    });
  }, []);

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
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('[data-voople-dropdown-menu="true"], [data-voople-group-people-drawer]')) return;
      event.preventDefault();
      event.stopPropagation();
      closeSurface("compact");
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeSurface, fullscreen, open, secondaryPanel]);

  const headerModel: VoiceRoomHeaderProps = {
    identity, connection, participantCount: stage.participants.length,
    hasGroupSounds: stage.groupSounds.length > 0, hasRoomMessages: Boolean(messages),
    roomMessagesOpen: secondaryPanel === "messages", roomSwitcher: embedded || fullscreen ? null : roomSwitcher,
    roomRename, access, fullscreen, fullscreenPending, leavePending: session.leavePending,
    canMinimizeToMini: session.inside,
    onMinimizeToMini: () => closeSurface("mini"), onCloseToCompact: () => closeSurface("compact"),
    onOpenSoundboard: () => setSecondaryPanel("soundboard"),
    onToggleRoomMessages: () => secondaryPanel === "messages" ? closeRoomMessages() : setSecondaryPanel("messages"),
    onOpenSettings: () => setSecondaryPanel("settings"), onToggleFullscreen: toggleFullscreen,
  };
  if (!open || !mounted) return null;
  if (!mainArea) return null;

  return createPortal(
    <section
      ref={surfaceRef}
      data-voople-room-surface="full"
      data-room-presentation={embedded ? "embedded" : fullscreen ? "fullscreen" : "main"}
      style={embedded ? frame ?? { visibility: "hidden" } : undefined}
      role="region"
      aria-label={`Комната ${identity.chatName}`}
      tabIndex={-1}
      className={cn(
        "bg-[var(--background)] outline-none",
        fullscreen ? "fixed inset-0 z-[200]" : embedded ? "absolute z-[30]" : "absolute inset-0 z-[80]",
      )}
    >
      <div
        data-orbit-chrome={orbitGroup}
        data-chat-open={secondaryPanel === "messages" ? "true" : "false"}
        className="voople-full-room h-full min-h-0 w-full overflow-hidden border-0 shadow-none"
      >
        <div className="voople-full-room__frame relative flex h-full min-h-0 min-w-0 max-sm:flex-col">
          {roomSwitcher && !embedded && !fullscreen ? <VoiceRoomSwitcher {...roomSwitcher} /> : null}
          <div className="voople-full-room__primary relative flex min-h-0 min-w-0 flex-1 flex-col">
            {orbitGroup ? embedded && channel ? createPortal(<><VoiceRoomChannelTitle identity={identity} rename={roomRename} /><VoiceRoomHeaderActions {...headerModel} placement="corner-top" /></>, channel) : <header className="voople-room-channel-standalone"><VoiceRoomChannelTitle identity={identity} rename={roomRename} /><VoiceRoomHeaderActions {...headerModel} placement="corner-top" /></header> : <VoiceRoomHeader {...headerModel} />}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <VoiceRoomContent
                identity={identity}
                stage={stage}
                controls={controls}
                session={session}
                errorMessage={connection.errorMessage}
                onInvite={invite ? () => setSecondaryPanel("invite") : undefined}
              />
              {pendingRoom ? <VoiceRoomSwitchStatus roomName={pendingRoom.name} /> : null}
            </div>
            <div className={orbitGroup ? "voople-orbit-call-controls" : undefined} data-needs-attention={Boolean(connection.audioBlocked || connection.errorMessage || session.leavePending)}>
            {orbitGroup ? <VoiceRoomHeaderActions {...headerModel} placement="toolbar" /> : null}
            <VoiceRoomFooter
              connection={connection}
              controls={controls}
              access={access}
              session={session}
            />
            </div>
            {orbitGroup ? <div className="voople-orbit-call-fullscreen"><VoiceRoomHeaderActions {...headerModel} placement="corner-bottom" /></div> : null}
          </div>
          {messages && secondaryPanel === "messages" ? (
            <RoomMessagesPanel model={messages} onClose={closeRoomMessages} />
          ) : null}
        </div>
      </div>

      <VoiceRoomPanels {...{ secondaryPanel, setSecondaryPanel, stage, invite, settingsPanel }} />
    </section>,
    mainArea,
  );
}
