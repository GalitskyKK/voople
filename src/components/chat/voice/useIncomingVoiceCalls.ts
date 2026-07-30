"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { IncomingCallView } from "@/types/chat";

function callKey(call: IncomingCallView) {
  return `${call.chatId}:${call.startedAt}`;
}

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
  const firstCallKey = firstCall ? callKey(firstCall) : null;
  const visibleCall =
    firstCall && firstCallKey !== handledKey ? firstCall : null;

  useEffect(() => {
    if (!subscribeToVoiceRooms) return;
    return subscribeToVoiceRooms(
      () => void utils.chat.incomingCalls.invalidate(),
    );
  }, [subscribeToVoiceRooms, utils]);

  useEffect(() => {
    if (!visibleCall || busy) return;
    const key = callKey(visibleCall);
    if (notifiedKeyRef.current === key) return;
    notifiedKeyRef.current = key;
    onIncomingCall?.(visibleCall);
  }, [busy, onIncomingCall, visibleCall]);

  useEffect(() => {
    if (!firstCall || !busy) return;
    const key = callKey(firstCall);
    if (busyKeyRef.current === key) return;
    busyKeyRef.current = key;
    setHandledKey(key);
    decline.mutate(
      { chatId: firstCall.chatId },
      {
        onError: () => {
          busyKeyRef.current = null;
          setHandledKey(null);
        },
      },
    );
  }, [busy, decline, firstCall]);

  const answer = useCallback(() => {
    if (!visibleCall) return;
    setHandledKey(callKey(visibleCall));
    onAnswer(visibleCall);
  }, [onAnswer, visibleCall]);

  const reject = useCallback(async () => {
    if (!visibleCall) return;
    const key = callKey(visibleCall);
    setHandledKey(key);
    try {
      await decline.mutateAsync({ chatId: visibleCall.chatId });
    } catch {
      setHandledKey(null);
    }
  }, [decline, visibleCall]);

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
