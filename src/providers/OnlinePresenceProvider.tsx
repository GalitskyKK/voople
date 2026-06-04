"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
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

export function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!me?.id) return;

    const supabase = createClient();
    const channelId = crypto.randomUUID();
    const channel = supabase.channel(`presence:global:${channelId}`, {
      config: { presence: { key: me.id } },
    });

    const syncPresence = () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      for (const presences of Object.values(state)) {
        for (const row of presences) {
          const userId = row?.user_id;
          if (typeof userId === "string") ids.add(userId);
        }
      }
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: me.id });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.id]);

  const value = useMemo(() => ({ onlineUserIds }), [onlineUserIds]);

  return <OnlinePresenceContext.Provider value={value}>{children}</OnlinePresenceContext.Provider>;
}
