"use client";

import { useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { ChatRoomView } from "@/types/chat";

export type CoreDirectCallTarget = {
  requestId: string;
  sessionId?: string;
};

/** Core call facts for the existing shared Room controller. */
export function useCoreDirectCallServerAdapter(
  chatId: string,
  open: boolean,
  target?: CoreDirectCallTarget,
) {
  const [sessionId, setSessionId] = useState(target?.sessionId ?? null);
  const sessionIdRef = useRef(sessionId);
  const utils = trpc.useUtils();
  const room = trpc.chat.coreDirectCallRoom.useQuery(
    { sessionId: sessionId ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: Boolean(target && sessionId), staleTime: 3_000,
      refetchInterval: target && sessionId ? open ? 5_000 : 15_000 : false },
  );
  const start = trpc.chat.coreStartDirectCall.useMutation();
  const answer = trpc.chat.coreAnswerDirectCall.useMutation();
  const finish = trpc.chat.coreFinishDirectCall.useMutation();
  const token = trpc.chat.coreDirectCallMediaToken.useMutation();

  async function currentRoom(id: string) {
    const next = await utils.chat.coreDirectCallRoom.fetch({ sessionId: id });
    utils.chat.coreDirectCallRoom.setData({ sessionId: id }, next);
    return next;
  }

  const unavailable = async () => { throw new Error("Сессия звонка недоступна"); };
  return {
    kind: "core-direct" as const,
    directory: null,
    room: {
      data: room.data,
      error: room.error,
      isLoading: Boolean(target && !sessionId) || room.isLoading,
      isFetching: room.isFetching,
      refetch: room.refetch,
      setData: (value: ChatRoomView) => {
        if (sessionIdRef.current) utils.chat.coreDirectCallRoom.setData({ sessionId: sessionIdRef.current }, value);
      },
    },
    enter: {
      isPending: start.isPending || answer.isPending,
      error: start.error ?? answer.error,
      run: async () => {
        if (!target) return unavailable();
        let id = sessionIdRef.current;
        if (!id) {
          const result = await start.mutateAsync({ conversationId: chatId, requestId: target.requestId });
          id = result.sessionId;
          sessionIdRef.current = id;
          setSessionId(id);
        }
        const current = await currentRoom(id);
        if (!current.isInside && current.status === "ringing") {
          await answer.mutateAsync({ sessionId: id });
        }
        return currentRoom(id);
      },
    },
    leave: {
      isPending: finish.isPending,
      error: finish.error,
      run: async () => {
        const id = sessionIdRef.current;
        if (!id) return;
        await finish.mutateAsync({ sessionId: id });
        await Promise.all([
          utils.chat.coreDirectCallRoom.invalidate({ sessionId: id }),
          utils.chat.coreMyDirectCall.invalidate(),
          utils.chat.coreIncomingCalls.invalidate(),
        ]);
      },
    },
    mediaToken: {
      isPending: token.isPending,
      error: token.error,
      get: () => {
        const id = sessionIdRef.current;
        return id ? token.mutateAsync({ sessionId: id }) : unavailable();
      },
    },
    access: { supported: false, isPending: false, error: null, set: () => undefined },
    rename: { supported: false, isPending: false, error: null, run: async () => undefined },
    roomActions: {
      supported: false, pendingRoomId: null, errorRoomId: null, error: null,
      rename: async () => undefined, setPinned: async () => undefined,
      archive: async () => undefined,
    },
    heartbeatSessionId: sessionId,
  };
}
