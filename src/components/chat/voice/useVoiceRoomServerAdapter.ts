"use client";

import { useMemo, useRef } from "react";

import { buildCoreRoomVoiceView } from "@/lib/chat/core-room-voice-session";
import { trpc } from "@/lib/trpc/client";
import type { ChatRoomView } from "@/types/chat";
import type {
  CoreVoiceSessionDescriptor,
  EnabledVoiceMediaCredentials,
  VoiceMediaCredentials,
} from "@/types/voice";

import { useVoiceRoomServerSession } from "./useVoiceRoomServerSession";

function optimisticCoreView(session: CoreVoiceSessionDescriptor): ChatRoomView {
  return {
    status: "active",
    accessMode: "open",
    startedBy: session.room.startedBy,
    startedAt: session.room.startedAt,
    endReason: null,
    participants: session.room.participants.map((participant) => ({
      id: participant.id,
      username: participant.username,
      displayName: participant.displayName,
      avatarUrl: participant.avatarUrl,
      avatarDecorationUrl: null,
      avatarRingId: null,
      micMuted: participant.micMuted ?? true,
      isMe: participant.isMe,
    })),
    isInside: true,
  };
}

export function useVoiceRoomServerAdapter({
  chatId,
  open,
  coreSession,
  initialCoreCredentials,
}: {
  chatId: string;
  open: boolean;
  coreSession?: CoreVoiceSessionDescriptor;
  initialCoreCredentials?: EnabledVoiceMediaCredentials;
}) {
  const core = Boolean(coreSession);
  const legacy = useVoiceRoomServerSession(chatId, open, !core);
  const utils = trpc.useUtils();
  const coreQuery = trpc.chat.coreGroupNow.useQuery(
    { groupId: coreSession?.groupId ?? chatId },
    {
      enabled: core,
      retry: false,
      staleTime: 3_000,
      refetchInterval: core ? open ? 5_000 : 15_000 : false,
    },
  );
  const coreLeave = trpc.chat.coreLeaveRoom.useMutation();
  const coreMediaToken = trpc.chat.coreRoomMediaToken.useMutation();
  const initialCredentialsRef = useRef<VoiceMediaCredentials | null>(
    initialCoreCredentials ?? null,
  );

  const coreRoom = useMemo(() => {
    if (!coreSession) return { data: undefined, error: null };
    if (!coreQuery.data) {
      return { data: optimisticCoreView(coreSession), error: null };
    }
    try {
      return {
        data: buildCoreRoomVoiceView(coreQuery.data, {
          roomId: coreSession.room.id,
          sessionId: coreSession.join.sessionId,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error("Сессия комнаты недоступна"),
      };
    }
  }, [coreQuery.data, coreSession]);

  if (!coreSession) {
    return {
      kind: "legacy" as const,
      room: {
        ...legacy.room,
        setData: (value: ChatRoomView) => legacy.utils.chat.room.setData({ chatId }, value),
      },
      enter: {
        isPending: legacy.enter.isPending,
        error: legacy.enter.error,
        run: (micMuted: boolean) => legacy.enter.mutateAsync({ chatId, micMuted }),
      },
      leave: {
        isPending: legacy.leave.isPending,
        error: legacy.leave.error,
        run: () => legacy.leave.mutateAsync({ chatId }),
      },
      mediaToken: {
        isPending: legacy.mediaToken.isPending,
        error: legacy.mediaToken.error,
        get: () => legacy.mediaToken.mutateAsync({ chatId }),
      },
      access: {
        supported: true,
        isPending: legacy.access.isPending,
        error: legacy.access.error,
        set: (accessMode: "open" | "locked") => legacy.access.mutate({ chatId, accessMode }),
      },
      heartbeatSessionId: null,
    };
  }

  return {
    kind: "core" as const,
    room: {
      data: coreRoom.data,
      error: coreRoom.error ?? coreQuery.error,
      isLoading: coreQuery.isLoading && !coreRoom.data,
      isFetching: coreQuery.isFetching,
      refetch: coreQuery.refetch,
      setData: () => undefined,
    },
    enter: {
      isPending: false,
      error: null,
      run: async () => {
        if (!coreRoom.data?.isInside) {
          throw new Error("Сессия завершилась. Откройте комнату заново.");
        }
        return coreRoom.data;
      },
    },
    leave: {
      isPending: coreLeave.isPending,
      error: coreLeave.error,
      run: async () => {
        await coreLeave.mutateAsync({ sessionId: coreSession.join.sessionId });
        await utils.chat.coreGroupNow.invalidate({ groupId: coreSession.groupId });
      },
    },
    mediaToken: {
      isPending: coreMediaToken.isPending,
      error: coreMediaToken.error,
      get: async () => {
        const initial = initialCredentialsRef.current;
        if (initial) {
          initialCredentialsRef.current = null;
          return initial;
        }
        return coreMediaToken.mutateAsync({ sessionId: coreSession.join.sessionId });
      },
    },
    access: {
      supported: false,
      isPending: false,
      error: null,
      set: () => undefined,
    },
    heartbeatSessionId: coreSession.join.sessionId,
  };
}

export type VoiceRoomServerAdapter = ReturnType<typeof useVoiceRoomServerAdapter>;
