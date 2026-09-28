"use client";

import { useCallback, useEffect, useState } from "react";

import { roomJoinErrorMessage } from "@/lib/chat/group-room-join";
import { resolveCurrentLiveSessionId } from "@/lib/chat/group-now";
import { splitCandidates } from "@/lib/chat/live-move-selection";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowUser } from "@/types/group-now";

const EMPTY_REQUEST_ID = "00000000-0000-4000-8000-000000000000";

type StoredRequest = {
  requestId: string;
  sourceSessionId: string;
  targetUserIds: string[];
  mode: "split" | "voop";
};

function key(groupId: string) { return `voople:live-move:${groupId}:pending`; }

function persist(groupId: string, request: StoredRequest | null) {
  try {
    if (request) sessionStorage.setItem(key(groupId), JSON.stringify(request));
    else sessionStorage.removeItem(key(groupId));
  } catch {
    // Private browsing must not block the request.
  }
}

export function useGroupLiveMove(groupId: string, currentSessionId?: string | null) {
  const utils = trpc.useUtils();
  const requestMutation = trpc.chat.coreRequestLiveMove.useMutation();
  const cancelMutation = trpc.chat.coreCancelLiveMove.useMutation();
  const [splitOptions, setSplitCandidates] = useState<GroupNowUser[] | null>(null);
  const [request, setRequest] = useState<StoredRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = trpc.chat.coreLiveMoveStatus.useQuery(
    { requestId: request?.requestId ?? EMPTY_REQUEST_ID },
    {
      enabled: Boolean(request),
      retry: false,
      refetchInterval: request ? 1_500 : false,
    },
  );

  useEffect(() => {
    if (!currentSessionId || request) return;
    try {
      const stored = JSON.parse(sessionStorage.getItem(key(groupId)) ?? "null") as StoredRequest | null;
      if (!stored) return;
      if (stored.sourceSessionId !== currentSessionId) {
        persist(groupId, null);
        return;
      }
      queueMicrotask(() => setRequest(stored));
    } catch {
      persist(groupId, null);
    }
  }, [currentSessionId, groupId, request]);

  useEffect(() => {
    if (!request || !status.data || status.data.status === "pending") return;
    queueMicrotask(() => {
      if (status.data?.status === "declined") setError("Запрос отклонён");
      if (status.data?.status === "expired") setError("Время запроса истекло");
      if (status.data?.status === "cancelled") setError("Исходный разговор изменился или запрос отменён");
      persist(groupId, null);
      setRequest(null);
    });
  }, [groupId, request, status.data]);

  const send = useCallback(async (mode: "split" | "voop", users: GroupNowUser[]) => {
    if (request || requestMutation.isPending || !users.length) return;
    setError(null);
    try {
      const now = await utils.client.chat.coreGroupNow.query({ groupId });
      const sourceSessionId = resolveCurrentLiveSessionId(now);
      const current = now.rooms.find((room) => room.id === now.currentUserRoomId);
      if (!sourceSessionId || !current) throw new Error("Сначала войдите в голосовую комнату");
      const allowed = new Set(splitCandidates(current.participants).map((person) => person.id));
      if (users.some((user) => !allowed.has(user.id))) throw new Error("Состав разговора изменился. Выберите участников заново");
      const created = await requestMutation.mutateAsync({
        groupId,
        mode,
        inviteeIds: users.map((user) => user.id),
        expectedSourceSessionId: sourceSessionId,
      });
      const next = { requestId: created.id, sourceSessionId, targetUserIds: users.map((user) => user.id), mode };
      persist(groupId, next);
      setRequest(next);
      setSplitCandidates(null);
    } catch (cause) {
      setError(roomJoinErrorMessage(cause));
    }
  }, [groupId, request, requestMutation, utils.client.chat.coreGroupNow]);

  const startSplit = useCallback(() => {
    if (request) return;
    setError(null);
    void (async () => {
      try {
        const now = await utils.client.chat.coreGroupNow.query({ groupId });
        const current = now.rooms.find((room) => room.id === now.currentUserRoomId);
        if (!current?.liveSessionId || !resolveCurrentLiveSessionId(now)) {
          throw new Error("Сначала войдите в голосовую комнату, чтобы разделиться");
        }
        const candidates = splitCandidates(current.participants);
        if (!candidates.length) throw new Error("В текущем разговоре пока не с кем разделиться");
        setSplitCandidates(candidates);
      } catch (cause) {
        setError(roomJoinErrorMessage(cause));
      }
    })();
  }, [groupId, request, utils.client.chat.coreGroupNow]);

  const cancel = useCallback(async () => {
    if (!request) return;
    try {
      await cancelMutation.mutateAsync({ requestId: request.requestId });
      persist(groupId, null);
      setRequest(null);
      setError(null);
    } catch (cause) {
      setError(roomJoinErrorMessage(cause));
    }
  }, [cancelMutation, groupId, request]);

  return {
    startSplit,
    startVoop: (user: GroupNowUser) => {
      if (request?.mode === "voop" && request.targetUserIds[0] === user.id) void cancel();
      else void send("voop", [user]);
    },
    submitSplit: (users: GroupNowUser[]) => { void send("split", users); },
    splitCandidates: splitOptions,
    closeSplitPicker: () => setSplitCandidates(null),
    request,
    status: status.data ?? null,
    pending: requestMutation.isPending || Boolean(request),
    cancelPending: cancelMutation.isPending,
    cancel,
    error,
  };
}
