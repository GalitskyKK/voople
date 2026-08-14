import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  PRESENCE_VISIBILITY_EVENT,
  shouldPublishPresence,
} from "@/lib/presence-privacy";
import {
  OnlineUsersProvider,
  useOnlineUsers,
} from "@/providers/OnlinePresenceProvider";

import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";
import { createDesktopTrpcClient } from "../api/trpc";

export function useDesktopPresence() {
  return useOnlineUsers().onlineUserIds;
}

export function DesktopPresenceProvider({
  children,
  config,
  session,
}: {
  children: ReactNode;
  config: DesktopConfig;
  session: Session;
}) {
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [publishPresence, setPublishPresence] = useState(() =>
    shouldPublishPresence(session.user.user_metadata),
  );
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  useEffect(() => {
    const onVisibilityChange = (event: Event) => {
      setPublishPresence((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(PRESENCE_VISIBILITY_EVENT, onVisibilityChange);
    return () => {
      window.removeEventListener(PRESENCE_VISIBILITY_EVENT, onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const touchPresence = () => {
      void client.mutation("user.touchPresence").catch(() => undefined);
    };
    touchPresence();
    const heartbeat = window.setInterval(touchPresence, 60_000);

    const supabase = getSupabase(config);
    const presence = supabase.channel("presence:global", {
      config: { presence: { key: session.user.id } },
    });
    const syncPresence = () => {
      const state = presence.presenceState() as Record<
        string,
        Array<{ user_id?: string }>
      >;
      const ids = new Set<string>();
      for (const entries of Object.values(state)) {
        for (const entry of entries) {
          if (entry.user_id) ids.add(entry.user_id);
        }
      }
      setOnlineUserIds(ids);
    };

    presence
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && publishPresence) {
          void presence.track({ user_id: session.user.id });
        }
      });

    return () => {
      window.clearInterval(heartbeat);
      void supabase.removeChannel(presence);
    };
  }, [client, config, publishPresence, session.user.id]);

  return (
    <OnlineUsersProvider onlineUserIds={onlineUserIds}>
      {children}
    </OnlineUsersProvider>
  );
}
