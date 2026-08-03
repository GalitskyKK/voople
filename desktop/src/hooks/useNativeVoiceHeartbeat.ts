import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

import type { VoiceSessionContextValue } from "@/components/chat/voice/VoiceSessionProvider";

import type { DesktopConfig } from "../config";

export function useNativeVoiceHeartbeat({
  config,
  accessToken,
  voiceSession,
}: {
  config: DesktopConfig;
  accessToken: string;
  voiceSession: Pick<VoiceSessionContextValue, "activeSession" | "state">;
}) {
  const chatId = voiceSession.activeSession?.chatId ?? null;
  const inside = voiceSession.state.inside;
  const micMuted = voiceSession.state.micMuted;

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window) || !inside || !chatId) return;

    const heartbeatId = crypto.randomUUID();
    void invoke("start_voice_heartbeat", {
      heartbeatId,
      apiUrl: config.apiUrl,
      accessToken,
      chatId,
      micMuted,
    }).catch((error) => console.error("Native voice heartbeat failed to start", error));

    return () => {
      void invoke("stop_voice_heartbeat", { heartbeatId }).catch(() => undefined);
    };
  }, [accessToken, chatId, config.apiUrl, inside, micMuted]);
}
