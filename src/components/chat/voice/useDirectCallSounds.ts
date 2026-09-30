"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { playProductSound, startProductSoundLoop } from "@/lib/sound/sound-playback";
import type { ChatRoomView } from "@/types/chat";

import { advanceDirectCallSound, getDirectCallPhase, hasOutgoingCallLoop, type DirectCallSoundProgress } from "./call-phase";

/** Audio follows existing call facts; it never creates or advances call state. */
export function useDirectCallSounds(input: {
  chatId: string;
  chatType: "direct" | "group";
  room: ChatRoomView | null | undefined;
  starter: boolean;
  inside: boolean;
  mediaConnected: boolean;
  participantCount: number;
  onLeaveConfirmed?: (chatId: string, sessionId: string | null) => void;
}) {
  const { preferences } = useAppPreferences();
  const direct = input.chatType === "direct";
  const phase = getDirectCallPhase({ direct, room: input.room, starter: input.starter });
  const startedAt = input.room?.startedAt ?? null;
  const sessionId = input.room?.sessionId ?? null;
  const endReason = input.room?.endReason ?? null;
  const progress = useRef<DirectCallSoundProgress>({ key: "", connected: false, resolved: false, observed: false });

  useEffect(() => {
    if (!direct) return;
    const next = advanceDirectCallSound(progress.current, {
      key: sessionId ?? (startedAt ? `${input.chatId}:${startedAt}` : null),
      phase,
      mediaReady: input.inside && input.mediaConnected && input.participantCount >= 2,
      endReason,
    });
    progress.current = next.progress;
    if (preferences.notificationSound && next.cue) void playProductSound(next.cue);
  }, [direct, endReason, input.chatId, input.inside, input.mediaConnected,
    input.participantCount, phase, preferences.notificationSound, sessionId, startedAt]);

  useEffect(() => {
    if (!direct || !preferences.notificationSound || !hasOutgoingCallLoop(phase)) return;
    const session = startProductSoundLoop("call.outgoing");
    return () => session.stop();
  }, [direct, phase, preferences.notificationSound, preferences.soundPack]);

  const reportLeave = input.onLeaveConfirmed;
  const onLeaveConfirmed = useCallback((chatId: string, sessionId: string | null) => {
    if (direct && !progress.current.resolved && progress.current.connected) {
      progress.current.resolved = true;
      if (preferences.notificationSound) void playProductSound("call.ended");
    }
    reportLeave?.(chatId, sessionId);
  }, [direct, reportLeave, preferences.notificationSound]);

  return { isDirect: direct, phase, onLeaveConfirmed };
}
