"use client";

import { useEffect, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";

import { GroupNowPanelView } from "./GroupNowPanelView";

export function GroupNowPanel({
  enabled = false,
  groupId,
  groupName,
  variant = "surface",
  onJoinRoom,
  onLeaveCurrent,
  leavePending = false,
  onCreateSplit,
  onCreateRoom,
  createPending = false,
  createError = null,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  groupName: string;
  variant?: "surface" | "shelf";
  onJoinRoom: (room: GroupNowRoom) => void | Promise<void>;
  onLeaveCurrent?: (room: GroupNowRoom) => void | Promise<void>;
  leavePending?: boolean;
  onCreateSplit?: (user?: GroupNowUser) => void;
  onCreateRoom?: () => void;
  createPending?: boolean;
  createError?: string | null;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const [online, setOnline] = useState(true);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = trpc.chat.coreGroupNow.useQuery(
    { groupId },
    {
      enabled: enabled && online,
      retry: false,
      refetchInterval: enabled && online ? 15_000 : false,
    },
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!enabled) return null;
  if (!online) {
    return <GroupNowPanelView mode="offline" groupName={groupName} variant={variant} onRetry={() => void query.refetch()} />;
  }
  if (query.isLoading || !query.data && query.isFetching) {
    return <GroupNowPanelView mode="loading" groupName={groupName} variant={variant} />;
  }
  if (query.error || !query.data) {
    return (
      <GroupNowPanelView
        mode="error"
        groupName={groupName}
        variant={variant}
        message={query.error?.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const joinRoom = async (room: GroupNowRoom) => {
    setActionError(null);
    setPendingRoomId(room.id);
    try {
      await onJoinRoom(room);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось открыть комнату");
    } finally {
      setPendingRoomId(null);
    }
  };

  const leaveRoom = async (room: GroupNowRoom) => {
    if (!onLeaveCurrent) return;
    setActionError(null);
    setPendingRoomId(room.id);
    try {
      await onLeaveCurrent(room);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось выйти из разговора");
    } finally {
      setPendingRoomId(null);
    }
  };

  return (
    <GroupNowPanelView
      mode="ready"
      value={query.data}
      variant={variant}
      pendingRoomId={pendingRoomId}
      actionError={actionError}
      onJoinRoom={(room) => void joinRoom(room)}
      onLeaveCurrent={onLeaveCurrent ? (room) => void leaveRoom(room) : undefined}
      leavePending={leavePending}
      onCreateSplit={onCreateSplit}
      onCreateRoom={onCreateRoom}
      createPending={createPending}
      createError={createError}
      onOpenProfile={onOpenProfile}
    />
  );
}
