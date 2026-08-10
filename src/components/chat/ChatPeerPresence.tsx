import { RelativeTime } from "@/components/ui/RelativeTime";

export function ChatPeerPresence({
  isOnline,
  lastSeenAt,
  username,
}: {
  isOnline: boolean;
  lastSeenAt?: string | null;
  username: string;
}) {
  if (isOnline) return <span className="text-emerald-500">в сети</span>;
  if (lastSeenAt) {
    return (
      <span>
        был(а) в сети <RelativeTime iso={lastSeenAt} />
      </span>
    );
  }
  return <>@{username}</>;
}
