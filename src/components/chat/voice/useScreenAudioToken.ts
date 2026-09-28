"use client";

import { useCallback } from "react";

import { trpc } from "@/lib/trpc/client";

export type ScreenAudioTokenTarget =
  | { kind: "legacy"; chatId: string }
  | { kind: "core"; sessionId: string };

export function useScreenAudioToken(target: ScreenAudioTokenTarget) {
  const legacyToken = trpc.chat.roomScreenAudioToken.useMutation();
  const coreToken = trpc.chat.coreRoomScreenAudioToken.useMutation();
  const createLegacyToken = legacyToken.mutateAsync;
  const createCoreToken = coreToken.mutateAsync;
  const targetKind = target.kind;
  const targetId = target.kind === "core" ? target.sessionId : target.chatId;

  const createToken = useCallback((screenSessionId: string) => (
    targetKind === "core"
      ? createCoreToken({ sessionId: targetId, screenSessionId })
      : createLegacyToken({ chatId: targetId, screenSessionId })
  ), [createCoreToken, createLegacyToken, targetId, targetKind]);

  return {
    createToken,
    pending: targetKind === "core" ? coreToken.isPending : legacyToken.isPending,
    error: (targetKind === "core" ? coreToken.error : legacyToken.error)?.message ?? null,
  };
}
