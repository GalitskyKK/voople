"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { playProductSound } from "@/lib/sound/sound-playback";
import { incomingCallExpiresAt, incomingCallKey, shouldNotifyIncomingCall, visibleIncomingCall } from "@/lib/chat/direct-call-state";
import type { IncomingCallView } from "@/types/chat";

export function useIncomingVoiceCalls({
  busy,
  onAnswer,
  onIncomingCall,
  subscribeToVoiceRooms,
}: {
  busy: boolean;
  onAnswer: (call: IncomingCallView) => void;
  onIncomingCall?: (call: IncomingCallView) => void;
  subscribeToVoiceRooms?: SubscribeToVoiceRooms;
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
  const decline = trpc.chat.declineCall.useMutation({
    onSuccess: () => void utils.chat.incomingCalls.invalidate(),
  });

  const firstCall = incoming.data?.[0] ?? null;
  const firstCallKey = firstCall ? incomingCallKey(firstCall) : null;
  const visibleCall = visibleIncomingCall(firstCall, handledKey, Math.max(now, Date.now()));

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
      },
    );
  }, [subscribeToVoiceRooms, utils]);

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
    decline.mutate(
      { chatId: visibleCall.chatId, startedAt: visibleCall.startedAt },
      {
        onError: () => {
          busyKeyRef.current = null;
          setHandledKey(null);
        },
      },
    );
  }, [busy, decline, visibleCall]);

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
      await decline.mutateAsync({ chatId: visibleCall.chatId, startedAt: visibleCall.startedAt });
      if (preferences.notificationSound) void playProductSound("call.declined");
    } catch {
      setHandledKey(null);
    }
  }, [decline, preferences.notificationSound, visibleCall]);

  return {
    answer,
    call: busy ? null : visibleCall,
    decline: reject,
    declinePending: decline.isPending,
  };
}

export type SubscribeToVoiceRooms = (
  onChange: () => void,
) => () => void;
