"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";

type OnlinePresenceContextValue = {
  onlineUserIds: ReadonlySet<string>;
};

const OnlinePresenceContext = createContext<OnlinePresenceContextValue>({
  onlineUserIds: new Set(),
});

export function useOnlineUsers() {
  return useContext(OnlinePresenceContext);
}

export function OnlineUsersProvider({
  onlineUserIds,
  children,
}: {
  onlineUserIds: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ onlineUserIds }), [onlineUserIds]);
  return (
    <OnlinePresenceContext.Provider value={value}>
      {children}
    </OnlinePresenceContext.Provider>
  );
}

export function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const touchPresence = trpc.user.touchPresence.useMutation();
  const touchPresenceMutate = touchPresence.mutate;
  const visiblePresence = trpc.social.visiblePresence.useQuery(undefined, {
    enabled: Boolean(me?.id),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
  const onlineUserIds = useMemo<ReadonlySet<string>>(
    () => new Set(visiblePresence.data?.userIds ?? []),
    [visiblePresence.data?.userIds],
  );

  useEffect(() => {
    if (!me?.id) return;

    touchPresenceMutate();
    const heartbeat = window.setInterval(() => touchPresenceMutate(), 30_000);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [me?.id, touchPresenceMutate]);

  return <OnlineUsersProvider onlineUserIds={onlineUserIds}>{children}</OnlineUsersProvider>;
}
