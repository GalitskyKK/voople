"use client";

import { useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";

import { useVoiceSession } from "./VoiceSessionProvider";

export function LiveMoveHandoffBridge() {
  const voice = useVoiceSession();
  const session = voice.activeSession?.coreSession;
  const sourceSessionId = session?.join.sessionId ?? null;
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<string | null>(null);
  const retryAfter = useRef(0);
  const latestSessionId = useRef(sourceSessionId);
  useEffect(() => { latestSessionId.current = sourceSessionId; }, [sourceSessionId]);
  const mediaToken = trpc.chat.coreRoomMediaToken.useMutation();
  const moves = trpc.chat.coreMyLiveMoves.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
    refetchInterval: session ? 1_500 : false,
  });

  useEffect(() => {
    if (!sourceSessionId) return;
    const move = moves.data?.find((candidate) =>
      candidate.status === "completed"
      && candidate.sourceSessionId === sourceSessionId
      && candidate.room && candidate.join,
    );
    if (!move?.room || !move.join || inFlight.current === move.id || Date.now() < retryAfter.current) return;
    inFlight.current = move.id;
    void (async () => {
      try {
        const credentials = await mediaToken.mutateAsync({ sessionId: move.join!.sessionId });
        if (!credentials.enabled) throw new Error("Медиасервер временно недоступен");
        if (latestSessionId.current !== sourceSessionId) return;
        voice.openCoreRoom({
          groupId: move.groupId,
          room: move.room!,
          join: move.join!,
          credentials,
        });
        setError(null);
      } catch (cause) {
        inFlight.current = null;
        retryAfter.current = Date.now() + 5_000;
        setError(cause instanceof Error ? cause.message : "Не удалось переключить голос");
      }
    })();
  }, [mediaToken, moves.data, sourceSessionId, voice]);

  return error ? (
    <p className="fixed bottom-20 right-4 z-[90] max-w-sm rounded-xl border border-red-500/25 bg-[var(--app-surface)] px-3 py-2 text-sm text-red-300" role="alert">
      Сплит выполнен, но голос не подключился: {error}
    </p>
  ) : null;
}
