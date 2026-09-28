"use client";

import { useMemo } from "react";

import { buildMessengerGroupLiveStates } from "@/lib/chat/messenger-live";
import { trpc } from "@/lib/trpc/client";

export function useMessengerGroupLiveStates() {
  const query = trpc.home.activeRooms.useQuery(undefined, {
    retry: false,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const liveByGroup = useMemo(
    () => buildMessengerGroupLiveStates(query.data?.rooms ?? []),
    [query.data?.rooms],
  );

  return { liveByGroup, error: query.error?.message ?? null };
}
