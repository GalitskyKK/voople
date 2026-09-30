"use client";

import { useCallback } from "react";

import { trpc } from "@/lib/trpc/client";

export type ScreenAudioTokenTarget =
  | { kind: "legacy"; chatId: string }
  | { kind: "core" | "core-direct"; sessionId: string };

export function useScreenAudioToken(target: ScreenAudioTokenTarget) {
  const legacyToken = trpc.chat.roomScreenAudioToken.useMutation();
  const coreToken = trpc.chat.coreRoomScreenAudioToken.useMutation();
  const coreDirectToken = trpc.chat.coreDirectCallScreenAudioToken.useMutation();
  const createLegacyToken = legacyToken.mutateAsync;
  const createCoreToken = coreToken.mutateAsync;
  const createCoreDirectToken = coreDirectToken.mutateAsync;
  const targetKind = target.kind;
  const targetId = target.kind === "legacy" ? target.chatId : target.sessionId;

  const createToken = useCallback((screenSessionId: string) => (
    targetKind === "core"
      ? createCoreToken({ sessionId: targetId, screenSessionId })
      : targetKind === "core-direct"
        ? createCoreDirectToken({ sessionId: targetId, screenSessionId })
      : createLegacyToken({ chatId: targetId, screenSessionId })
  ), [createCoreDirectToken, createCoreToken, createLegacyToken, targetId, targetKind]);

  return {
    createToken,
    pending: targetKind === "core" ? coreToken.isPending : targetKind === "core-direct" ? coreDirectToken.isPending : legacyToken.isPending,
    error: (targetKind === "core" ? coreToken.error : targetKind === "core-direct" ? coreDirectToken.error : legacyToken.error)?.message ?? null,
  };
}
