"use client";
import { Sheet } from "@/components/ui/Sheet";
import { CoreRoomInvitePanel } from "./CoreRoomInvitePanel";
import { VoiceSoundboardPanel } from "./VoiceSoundboardPanel";
import type { VoiceRoomMainSurfaceProps } from "./voice-room-sheet-models";
export type SecondaryPanel = "settings" | "soundboard" | "invite" | "messages" | null;
export function VoiceRoomPanels({ secondaryPanel, setSecondaryPanel, stage, invite, settingsPanel }: Pick<VoiceRoomMainSurfaceProps, "stage" | "invite" | "settingsPanel"> & {
 secondaryPanel: SecondaryPanel; setSecondaryPanel: (panel: SecondaryPanel) => void;
}) {
 return <>
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
 </>;
}
