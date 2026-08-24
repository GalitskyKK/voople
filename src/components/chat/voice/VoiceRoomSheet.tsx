"use client";

import { useEffect, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

import { useVoiceRoomFullscreen } from "./useVoiceRoomFullscreen";
import type { VoiceRoomSheetProps } from "./voice-room-sheet-models";
import { VoiceRoomContent } from "./VoiceRoomContent";
import { VoiceRoomFooter } from "./VoiceRoomFooter";
import { VoiceRoomHeader } from "./VoiceRoomHeader";
import { VoiceSoundboardPanel } from "./VoiceSoundboardPanel";

type SecondaryPanel = "settings" | "soundboard" | null;

/** Stateful sheet boundary; visual room sections remain stateless and platform-shared. */
export function VoiceRoomSheet({
  overlay: { open, onClose },
  identity,
  connection,
  stage,
  controls,
  access,
  session,
  settingsPanel,
}: VoiceRoomSheetProps) {
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanel>(null);
  const {
    fullscreen,
    pending: fullscreenPending,
    toggleFullscreen,
    exitFullscreen,
  } = useVoiceRoomFullscreen();

  const close = () => {
    setSecondaryPanel(null);
    void exitFullscreen();
    onClose();
  };

  useEffect(() => {
    if (!open) void exitFullscreen();
  }, [exitFullscreen, open]);

  return (
    <Sheet
      open={open}
      onClose={close}
      ariaLabel={`Комната ${identity.chatName}`}
      containerClassName={fullscreen ? "p-0 sm:p-0" : undefined}
      closeOnEscape={!fullscreen}
      className={cn(
        "overflow-hidden",
        identity.active
          ? "h-[min(94dvh,860px)] max-h-[94dvh] max-w-6xl p-0"
          : identity.isDirect
            ? "max-w-xl"
            : "max-w-2xl",
        fullscreen && "h-dvh max-h-none max-w-none rounded-none border-0 p-0 sm:rounded-none",
      )}
    >
      <div className={cn("flex min-h-0 flex-col", identity.active && "h-full")}>
        <VoiceRoomHeader
          identity={identity}
          connection={connection}
          participantCount={stage.participants.length}
          hasGroupSounds={stage.groupSounds.length > 0}
          access={access}
          fullscreen={fullscreen}
          fullscreenPending={fullscreenPending}
          onOpenSoundboard={() => setSecondaryPanel("soundboard")}
          onOpenSettings={() => setSecondaryPanel("settings")}
          onToggleFullscreen={toggleFullscreen}
        />
        <VoiceRoomContent
          identity={identity}
          stage={stage}
          controls={controls}
          onInvite={close}
        />
        <VoiceRoomFooter
          identity={identity}
          connection={connection}
          controls={controls}
          access={access}
          session={session}
        />
      </div>

      <Sheet
        open={open && secondaryPanel === "settings"}
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
        open={open && secondaryPanel === "soundboard"}
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
    </Sheet>
  );
}
