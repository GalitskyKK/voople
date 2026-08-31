"use client";

import { useEffect, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";

import { GroupNowPanelView } from "./GroupNowPanelView";

export function GroupNowPanel({
  enabled = false,
  groupId,
  groupName,
  onJoinRoom,
  onCreateRoom,
  onOpenProfile,
}: {
  enabled?: boolean;
  groupId: string;
  groupName: string;
  onJoinRoom: (room: GroupNowRoom) => void | Promise<void>;
  onCreateRoom?: () => void;
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
    return <GroupNowPanelView mode="offline" groupName={groupName} onRetry={() => void query.refetch()} />;
  }
  if (query.isLoading || !query.data && query.isFetching) {
    return <GroupNowPanelView mode="loading" groupName={groupName} />;
  }
  if (query.error || !query.data) {
    return (
      <GroupNowPanelView
        mode="error"
        groupName={groupName}
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

  return (
    <GroupNowPanelView
      mode="ready"
      value={query.data}
      pendingRoomId={pendingRoomId}
      actionError={actionError}
      onJoinRoom={(room) => void joinRoom(room)}
      onCreateRoom={onCreateRoom}
      onOpenProfile={onOpenProfile}
    />
  );
}
