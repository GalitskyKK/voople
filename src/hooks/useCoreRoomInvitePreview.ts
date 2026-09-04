"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { isCoreRoomInviteId, resolveCoreRoomInvitePreview } from "@/lib/chat/core-room-invite-preview";
import { trpc } from "@/lib/trpc/client";

function subscribeNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useCoreRoomInvitePreview(inviteId: string) {
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  const [now, setNow] = useState(() => Date.now());
  const valid = isCoreRoomInviteId(inviteId);
  const query = trpc.chat.coreRoomInvitePreview.useQuery({ inviteId }, {
    enabled: valid,
    retry: false,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (query.data?.status !== "pending") return;
    const tick = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = window.setInterval(tick, 1_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [query.data?.status, query.data?.expiresAt]);

  return {
    state: resolveCoreRoomInvitePreview({
      valid, online: online && query.fetchStatus !== "paused", loading: query.isPending,
      error: Boolean(query.error), invite: query.data, now,
    }),
    retry: () => { void query.refetch(); },
  };
}
