"use client";

import { RelativeTime } from "@/components/ui/RelativeTime";
import { useOnlineUsers } from "@/providers/OnlinePresenceProvider";

export function ProfilePresenceLabel({
  userId,
  lastSeenAt,
}: {
  userId: string;
  lastSeenAt?: string | null;
}) {
  const { onlineUserIds } = useOnlineUsers();
  if (onlineUserIds.has(userId)) {
    return <span className="text-emerald-500">В сети</span>;
  }
  if (!lastSeenAt) return null;
  return <>Был(а) в сети <RelativeTime iso={lastSeenAt} /></>;
}
