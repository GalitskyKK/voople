"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  isCrossContextRoomJoinError,
  roomJoinErrorMessage,
} from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoom, GroupNowRoomTarget, GroupNowUser } from "@/types/group-now";
import type { GroupRoomCreateAndJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { useGroupNowMediaHandoff } from "./useGroupNowMediaHandoff";

export type GroupNowRoomCreateDraft = {
  kind: "temporary" | "pinned";
  name: string;
};

type PendingCreation = GroupNowRoomCreateDraft & { requestId: string };

const DEFAULT_SPLIT_DRAFT: GroupNowRoomCreateDraft = {
  kind: "temporary",
  name: "Сплит",
};
const EMPTY_INVITE_ID = "00000000-0000-4000-8000-000000000000";

type StoredVoopRequest = {
  inviteId: string;
  sourceSessionId: string;
  targetUserId: string;
};

function voopStorageKey(groupId: string) {
  return `voople:voop:${groupId}:pending`;
}

function storeVoopRequest(groupId: string, request: StoredVoopRequest | null) {
  try {
    if (request) {
      sessionStorage.setItem(voopStorageKey(groupId), JSON.stringify(request));
    } else {
      sessionStorage.removeItem(voopStorageKey(groupId));
    }
  } catch {
    // A denied storage permission must not block the live interaction.
  }
}

function toCreatedRoom(result: GroupRoomCreateAndJoinResult): GroupNowRoom {
  return {
    id: result.room.id,
    kind: result.room.kind,
    name: result.room.name,
    joinTarget: { kind: "room", roomId: result.room.id },
    state: "active",
    liveSessionId: result.join.sessionId,
    startedAt: new Date().toISOString(),
    startedBy: null,
    participantCount: 1,
    hasScreenShare: false,
    participants: [],
  };
}

export function useGroupNowRoomCreate({
  groupId,
  currentSessionId,
  onJoined,
}: {
  groupId: string;
  currentSessionId?: string | null;
  onJoined: (
    room: GroupNowRoom,
    result: GroupRoomCreateAndJoinResult["join"],
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
}) {
  const createMutation = trpc.chat.coreCreateAndJoinRoom.useMutation();
  const sendVoopMutation = trpc.chat.coreSendVoop.useMutation();
  const cancelVoopMutation = trpc.chat.coreCancelRoomInvite.useMutation();
  const joinMutation = trpc.chat.coreJoinRoom.useMutation();
  const mediaHandoff = useGroupNowMediaHandoff({
    onJoined: (target: GroupNowRoomTarget, result, credentials) =>
      onJoined(target.room, result, credentials),
  });
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<PendingCreation | null>(null);
  const [retryCreation, setRetryCreation] = useState<PendingCreation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [voopRequestId, setVoopRequestId] = useState<string | null>(null);
  const handledVoopRef = useRef<string | null>(null);
  const voopStatus = trpc.chat.coreVoopStatus.useQuery(
    { inviteId: voopRequestId ?? EMPTY_INVITE_ID },
    {
      enabled: Boolean(voopRequestId),
      retry: false,
      refetchInterval: voopRequestId ? 1_500 : false,
      refetchOnWindowFocus: true,
    },
  );
  const pending = createMutation.isPending
    || sendVoopMutation.isPending
    || cancelVoopMutation.isPending
    || joinMutation.isPending
    || mediaHandoff.pending
    || Boolean(voopRequestId);

  useEffect(() => {
    if (!currentSessionId || voopRequestId) return;
    let frame = 0;
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(voopStorageKey(groupId)) ?? "null",
      ) as StoredVoopRequest | null;
      if (!stored) return;
      if (stored.sourceSessionId !== currentSessionId) {
        storeVoopRequest(groupId, null);
        return;
      }
      frame = window.requestAnimationFrame(() => {
        setTargetUserId(stored.targetUserId);
        setVoopRequestId(stored.inviteId);
      });
    } catch {
      storeVoopRequest(groupId, null);
    }
    return () => window.cancelAnimationFrame(frame);
  }, [currentSessionId, groupId, voopRequestId]);

  useEffect(() => {
    const requestId = voopRequestId;
    const status = voopStatus.data;
    const room = status?.room ?? null;
    if (!requestId || !status || status.status === "pending") return;
    // The accepted status and the Group Now read model can arrive in separate
    // realtime turns. Keep polling until the accepted target Room is visible.
    if (status.status === "accepted" && !room) return;
    if (status.status !== "accepted") {
      queueMicrotask(() => {
        setError(status.status === "declined" ? "Вуп отклонён" : "Вуп больше недоступен");
        storeVoopRequest(groupId, null);
        setVoopRequestId(null);
        setTargetUserId(null);
      });
      return;
    }
    if (!room) return;
    if (handledVoopRef.current === requestId) return;
    handledVoopRef.current = requestId;
    void (async () => {
      try {
        const join = await joinMutation.mutateAsync({
          roomId: room.id,
          micMuted: true,
          confirmedCrossContext: false,
        });
        await mediaHandoff.connect({ groupId, room }, join);
        setError(null);
      } catch (cause) {
        setError(roomJoinErrorMessage(cause));
      } finally {
        storeVoopRequest(groupId, null);
        setVoopRequestId(null);
        setTargetUserId(null);
      }
    })();
  }, [groupId, joinMutation, mediaHandoff, voopRequestId, voopStatus.data]);

  const finishCreate = useCallback(async (
    draft: PendingCreation,
    confirmedCrossContext: boolean,
  ) => {
    const result = await createMutation.mutateAsync({
      groupId,
      kind: draft.kind,
      name: draft.name,
      requestId: draft.requestId,
      micMuted: true,
      confirmedCrossContext,
    });
    await mediaHandoff.connect({
      groupId,
      room: toCreatedRoom(result),
    }, result.join);
  }, [createMutation, groupId, mediaHandoff]);

  const close = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setRetryCreation(null);
    setTargetUserId(null);
    setError(null);
    setOpen(false);
  }, [pending]);

  const submit = useCallback(async (draft: GroupNowRoomCreateDraft) => {
    if (pending) return;
    const pendingCreation = retryCreation
      && retryCreation.kind === draft.kind
      && retryCreation.name === draft.name
      ? retryCreation
      : { ...draft, requestId: crypto.randomUUID() };
    setRetryCreation(pendingCreation);
    setError(null);
    try {
      await finishCreate(pendingCreation, false);
      setRetryCreation(null);
      setTargetUserId(null);
      setOpen(false);
    } catch (cause) {
      if (isCrossContextRoomJoinError(cause)) {
        setConfirmation(pendingCreation);
        setOpen(true);
        return;
      }
      setError(roomJoinErrorMessage(cause));
      setTargetUserId(null);
    }
  }, [finishCreate, pending, retryCreation]);

  const startSplit = useCallback((user?: GroupNowUser) => {
    if (user && voopRequestId && targetUserId === user.id) {
      void (async () => {
        try {
          await cancelVoopMutation.mutateAsync({ inviteId: voopRequestId });
          storeVoopRequest(groupId, null);
          setVoopRequestId(null);
          setTargetUserId(null);
          setError(null);
        } catch (cause) {
          setError(roomJoinErrorMessage(cause));
        }
      })();
      return;
    }
    if (pending) return;
    setConfirmation(null);
    setError(null);
    setTargetUserId(user?.id ?? null);
    setOpen(false);
    if (!user) {
      void submit(DEFAULT_SPLIT_DRAFT);
      return;
    }
    if (!currentSessionId) {
      setError("Сначала войдите в голосовую комнату, чтобы позвать человека отойти");
      setTargetUserId(null);
      return;
    }
    void (async () => {
      try {
        const request = await sendVoopMutation.mutateAsync({
          sessionId: currentSessionId,
          inviteeId: user.id,
        });
        handledVoopRef.current = null;
        storeVoopRequest(groupId, {
          inviteId: request.id,
          sourceSessionId: currentSessionId,
          targetUserId: user.id,
        });
        setVoopRequestId(request.id);
      } catch (cause) {
        setError(roomJoinErrorMessage(cause));
        setTargetUserId(null);
      }
    })();
  }, [cancelVoopMutation, currentSessionId, groupId, pending, sendVoopMutation, submit, targetUserId, voopRequestId]);

  const showRoom = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setRetryCreation(null);
    setError(null);
    setOpen(true);
  }, [pending]);

  const confirm = useCallback(async () => {
    if (!confirmation || pending) return;
    setError(null);
    try {
      await finishCreate(confirmation, true);
      setConfirmation(null);
      setRetryCreation(null);
      setTargetUserId(null);
      setOpen(false);
    } catch (cause) {
      setError(roomJoinErrorMessage(cause));
      setTargetUserId(null);
    }
  }, [confirmation, finishCreate, pending]);

  const back = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setError(null);
  }, [pending]);

  return {
    back,
    close,
    confirm,
    confirmation,
    error,
    open,
    pending,
    showRoom,
    startSplit,
    submit,
    targetUserId,
  };
}
