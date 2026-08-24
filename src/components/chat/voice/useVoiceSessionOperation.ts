"use client";

import { useCallback, useEffect, useRef } from "react";

import { createVoiceOperationGate } from "@/lib/livekit/voice-operation-gate";

type VoiceSessionOperationScope = {
  isCurrent: () => boolean;
};

/**
 * Single-flight boundary for enter/connect. Cancellation invalidates the
 * current generation without allowing a second join to race its cleanup.
 */
export function useVoiceSessionOperation() {
  const gateRef = useRef(createVoiceOperationGate());
  const mountedRef = useRef(true);
  const activeRef = useRef<Promise<void> | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
    gateRef.current.cancel();
  }, []);

  const cancel = useCallback(() => {
    gateRef.current.cancel();
  }, []);

  const run = useCallback((operation: (scope: VoiceSessionOperationScope) => Promise<void>) => {
    if (activeRef.current) return activeRef.current;

    const token = gateRef.current.begin();
    const scope = {
      isCurrent: () => mountedRef.current && gateRef.current.isCurrent(token),
    };
    const task = Promise.resolve().then(() => operation(scope));
    activeRef.current = task;
    const release = () => {
      if (activeRef.current === task) activeRef.current = null;
    };
    void task.then(release, release);
    return task;
  }, []);

  return { cancel, run };
}
