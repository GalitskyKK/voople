"use client";

import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { useVisibleClock } from "@/hooks/useVisibleClock";
import { isCoreRoomInviteId, resolveCoreRoomInvitePreview } from "@/lib/chat/core-room-invite-preview";
import { trpc } from "@/lib/trpc/client";

export function useCoreRoomInvitePreview(inviteId: string) {
  const online = useBrowserOnline();
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
  const now = useVisibleClock(query.data?.status === "pending");

  return {
    state: resolveCoreRoomInvitePreview({
      valid, online: online && query.fetchStatus !== "paused", loading: query.isPending,
      error: Boolean(query.error), invite: query.data, now,
    }),
    retry: () => { void query.refetch(); },
  };
}
