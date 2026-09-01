"use client";

import { useCallback, useState } from "react";

import {
  isCrossContextRoomJoinError,
  roomJoinErrorMessage,
} from "@/lib/chat/group-room-join";
import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoom, GroupNowRoomTarget } from "@/types/group-now";
import type { GroupRoomCreateAndJoinResult } from "@/types/group-room-mutations";
import type { EnabledVoiceMediaCredentials } from "@/types/voice";

import { useGroupNowMediaHandoff } from "./useGroupNowMediaHandoff";

export type GroupNowRoomCreateDraft = {
  kind: "temporary" | "pinned";
  name: string;
};

type PendingCreation = GroupNowRoomCreateDraft & { requestId: string };

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
  onJoined,
}: {
  groupId: string;
  onJoined: (
    room: GroupNowRoom,
    result: GroupRoomCreateAndJoinResult["join"],
    credentials: EnabledVoiceMediaCredentials,
  ) => void | Promise<void>;
}) {
  const createMutation = trpc.chat.coreCreateAndJoinRoom.useMutation();
  const mediaHandoff = useGroupNowMediaHandoff({
    onJoined: (target: GroupNowRoomTarget, result, credentials) =>
      onJoined(target.room, result, credentials),
  });
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<PendingCreation | null>(null);
  const [retryCreation, setRetryCreation] = useState<PendingCreation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = createMutation.isPending || mediaHandoff.pending;

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

  const show = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setRetryCreation(null);
    setError(null);
    setOpen(true);
  }, [pending]);

  const close = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setRetryCreation(null);
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
      setOpen(false);
    } catch (cause) {
      if (isCrossContextRoomJoinError(cause)) {
        setConfirmation(pendingCreation);
        return;
      }
      setError(roomJoinErrorMessage(cause));
    }
  }, [finishCreate, pending, retryCreation]);

  const confirm = useCallback(async () => {
    if (!confirmation || pending) return;
    setError(null);
    try {
      await finishCreate(confirmation, true);
      setConfirmation(null);
      setRetryCreation(null);
      setOpen(false);
    } catch (cause) {
      setError(roomJoinErrorMessage(cause));
    }
  }, [confirmation, finishCreate, pending]);

  const back = useCallback(() => {
    if (pending) return;
    setConfirmation(null);
    setError(null);
  }, [pending]);

  return { back, close, confirm, confirmation, error, open, pending, show, submit };
}
