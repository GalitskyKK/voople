import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  OnlineUsersProvider,
  useOnlineUsers,
} from "@/providers/OnlinePresenceProvider";

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
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  useEffect(() => {
    let active = true;
    const touchPresence = () => {
      void client.mutation("user.touchPresence").catch(() => undefined);
    };
    const loadVisiblePresence = () => {
      void client.query("social.visiblePresence").then((result) => {
        if (!active) return;
        const userIds = (result as { userIds?: unknown }).userIds;
        setOnlineUserIds(new Set(Array.isArray(userIds) ? userIds.filter((id): id is string => typeof id === "string") : []));
      }).catch(() => undefined);
    };
    touchPresence();
    loadVisiblePresence();
    const heartbeat = window.setInterval(touchPresence, 30_000);
    const refresh = window.setInterval(loadVisiblePresence, 15_000);

    return () => {
      active = false;
      window.clearInterval(heartbeat);
      window.clearInterval(refresh);
    };
  }, [client]);

  return (
    <OnlineUsersProvider onlineUserIds={onlineUserIds}>
      {children}
    </OnlineUsersProvider>
  );
}
