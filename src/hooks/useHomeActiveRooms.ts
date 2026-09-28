"use client";

import { useMemo } from "react";

import { mergeHomeActiveRooms } from "@/lib/social/home-live";
import { trpc } from "@/lib/trpc/client";
import type { HomeOverviewView } from "@/types/home";

const HOME_ROOM_REFRESH_MS = 15_000;

export function useHomeActiveRooms(overview: HomeOverviewView) {
  const initialRooms = useMemo(
    () => overview.now.filter((item) => item.kind === "room"),
    [overview.now],
  );
  const query = trpc.home.activeRooms.useQuery(undefined, {
    initialData: { rooms: initialRooms },
    refetchInterval: HOME_ROOM_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const mergedOverview = useMemo(
    () => mergeHomeActiveRooms(overview, query.data?.rooms ?? initialRooms),
    [initialRooms, overview, query.data?.rooms],
  );

  return {
    overview: mergedOverview,
    refreshing: query.isFetching && !query.isLoading,
    paused: query.fetchStatus === "paused",
    error: query.error?.message ?? null,
    retry: query.refetch,
  };
}
