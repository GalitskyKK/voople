"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  PRESENCE_VISIBILITY_EVENT,
  shouldPublishPresence,
} from "@/lib/presence-privacy";
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
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(() => new Set());
  const [publishPresence, setPublishPresence] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setPublishPresence(shouldPublishPresence(data.user?.user_metadata));
    });
    const onVisibilityChange = (event: Event) => {
      setPublishPresence((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(PRESENCE_VISIBILITY_EVENT, onVisibilityChange);
    return () => {
      active = false;
      window.removeEventListener(PRESENCE_VISIBILITY_EVENT, onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!me?.id || publishPresence === null) return;

    touchPresenceMutate();
    const heartbeat = window.setInterval(() => touchPresenceMutate(), 60_000);

    const supabase = createClient();
    const channel = supabase.channel("presence:global", {
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
          if (publishPresence) await channel.track({ user_id: me.id });
        }
      });

    return () => {
      window.clearInterval(heartbeat);
      void supabase.removeChannel(channel);
    };
  }, [me?.id, publishPresence, touchPresenceMutate]);

  return <OnlineUsersProvider onlineUserIds={onlineUserIds}>{children}</OnlineUsersProvider>;
}
