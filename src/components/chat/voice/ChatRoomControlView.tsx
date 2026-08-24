"use client";

import { ScreenShareSourcePicker } from "./ScreenShareSourcePicker";
import type { ChatRoomController } from "./useChatRoomControl";
import { VoiceMiniStage } from "./VoiceMiniStage";
import { VoiceRoomSheet } from "./VoiceRoomSheet";
import { VoiceRoomTrigger } from "./VoiceRoomTrigger";
import { VoiceSessionDock } from "./VoiceSessionDock";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";

/** Shared web/desktop presentation. All state and platform effects live in the controller. */
export function ChatRoomControlView({ controller }: { controller: ChatRoomController }) {
  const {
    roots: { audioContainerRef, screenParkingRef, cameraParkingRef },
    trigger,
    dock,
    settings,
    sheet,
    picker,
  } = controller;

  return (
    <>
      {trigger ? <VoiceRoomTrigger {...trigger} /> : null}

      <div ref={audioContainerRef} hidden aria-hidden="true" />
      <div
        ref={screenParkingRef}
        className="pointer-events-none fixed -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      />
      <div
        ref={cameraParkingRef}
        className="pointer-events-none fixed -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden="true"
      />

      {dock ? (
        <VoiceSessionDock
          {...dock}
          mediaPreview={
            dock.preview ? <VoiceMiniStage {...dock.preview} /> : undefined
          }
        />
      ) : null}

      <VoiceRoomSheet
        {...sheet}
        settingsPanel={<VoiceSettingsPanel {...settings} />}
      />

      {picker ? <ScreenShareSourcePicker {...picker} /> : null}
    </>
  );
}
