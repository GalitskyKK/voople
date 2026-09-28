"use client";

import { useCallback, useState } from "react";
import type { VoiceSessionParticipants } from "@/types/voice-session-participants";

/** Deduplicates presentation snapshots when a server adapter remaps equal rows. */
export function useVoiceParticipantSnapshot() {
  const [participantDetails, setParticipantDetails] = useState<VoiceSessionParticipants | null>(null);
  const handleParticipantsChange = useCallback((next: VoiceSessionParticipants | null) => {
    setParticipantDetails((current) =>
      current?.sessionId === next?.sessionId &&
      current?.setParticipantVolume === next?.setParticipantVolume &&
      JSON.stringify(current?.participants) === JSON.stringify(next?.participants)
        ? current : next);
  }, []);
  return { participantDetails, handleParticipantsChange };
}
