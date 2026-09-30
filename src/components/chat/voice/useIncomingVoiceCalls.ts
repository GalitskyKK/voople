"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { playProductSound } from "@/lib/sound/sound-playback";
import { incomingCallExpiresAt, incomingCallKey, mergeIncomingCalls, shouldNotifyIncomingCall, visibleIncomingCall } from "@/lib/chat/direct-call-state";
import type { IncomingCallView } from "@/types/chat";

export function useIncomingVoiceCalls({
  busy,
  onAnswer,
  onIncomingCall,
  subscribeToVoiceRooms,
  coreEnabled = false,
}: {
  busy: boolean;
  onAnswer: (call: IncomingCallView) => void;
  onIncomingCall?: (call: IncomingCallView) => void;
  subscribeToVoiceRooms?: SubscribeToVoiceRooms;
  coreEnabled?: boolean;
}) {
  const [handledKey, setHandledKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { preferences } = useAppPreferences();
  const notifiedKeyRef = useRef<string | null>(null);
  const busyKeyRef = useRef<string | null>(null);
  const utils = trpc.useUtils();
  const incoming = trpc.chat.incomingCalls.useQuery(undefined, {
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const coreIncoming = trpc.chat.coreIncomingCalls.useQuery(undefined, {
    enabled: coreEnabled,
    refetchInterval: coreEnabled ? 10_000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const decline = trpc.chat.declineCall.useMutation({
    onSuccess: () => void utils.chat.incomingCalls.invalidate(),
  });
  const coreDecline = trpc.chat.coreFinishDirectCall.useMutation({
    onSuccess: () => void utils.chat.coreIncomingCalls.invalidate(),
  });

  const firstCall = mergeIncomingCalls(coreIncoming.data ?? [], incoming.data ?? [])[0] ?? null;
  const firstCallKey = firstCall ? incomingCallKey(firstCall) : null;
  const visibleCall = visibleIncomingCall(firstCall, handledKey, now);

  useEffect(() => {
    if (!firstCall) return;
    const remaining = incomingCallExpiresAt(firstCall) - Date.now();
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [firstCall, firstCallKey]);

  useEffect(() => {
    if (!subscribeToVoiceRooms) return;
    return subscribeToVoiceRooms(
      () => {
        void utils.chat.incomingCalls.invalidate();
        void utils.chat.room.invalidate();
        if (coreEnabled) {
          void utils.chat.coreIncomingCalls.invalidate();
          void utils.chat.coreDirectCallRoom.invalidate();
          void utils.chat.coreMyDirectCall.invalidate();
        }
      },
    );
  }, [coreEnabled, subscribeToVoiceRooms, utils]);

  useEffect(() => {
    if (!visibleCall || busy) return;
    const key = incomingCallKey(visibleCall);
    if (!shouldNotifyIncomingCall(key, busy, notifiedKeyRef.current)) return;
    notifiedKeyRef.current = key;
    onIncomingCall?.(visibleCall);
  }, [busy, onIncomingCall, visibleCall]);

  useEffect(() => {
    if (!visibleCall || !busy) return;
    const key = incomingCallKey(visibleCall);
    if (busyKeyRef.current === key) return;
    busyKeyRef.current = key;
    setHandledKey(key);
    const onError = () => { busyKeyRef.current = null; setHandledKey(null); };
    if (visibleCall.coreSessionId) {
      coreDecline.mutate({ sessionId: visibleCall.coreSessionId }, { onError });
    } else {
      decline.mutate({ chatId: visibleCall.chatId, startedAt: visibleCall.startedAt }, { onError });
    }
  }, [busy, coreDecline, decline, visibleCall]);

  const answer = useCallback(() => {
    if (!visibleCall) return;
    setHandledKey(incomingCallKey(visibleCall));
    onAnswer(visibleCall);
  }, [onAnswer, visibleCall]);

  const reject = useCallback(async () => {
    if (!visibleCall) return;
    const key = incomingCallKey(visibleCall);
    setHandledKey(key);
    try {
      if (visibleCall.coreSessionId) await coreDecline.mutateAsync({ sessionId: visibleCall.coreSessionId });
      else await decline.mutateAsync({ chatId: visibleCall.chatId, startedAt: visibleCall.startedAt });
      if (preferences.notificationSound) void playProductSound("call.declined");
    } catch {
      setHandledKey(null);
    }
  }, [coreDecline, decline, preferences.notificationSound, visibleCall]);

  return {
    answer,
    call: busy ? null : visibleCall,
    decline: reject,
    declinePending: decline.isPending || coreDecline.isPending,
  };
}

export type SubscribeToVoiceRooms = (
  onChange: () => void,
) => () => void;
