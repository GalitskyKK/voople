import { Radio } from "lucide-react";

import type { ChatMessageRoomContext as RoomContext } from "@/types/chat";

type ChatMessageRoomContextProps = {
  context: RoomContext;
};

export function ChatMessageRoomContext({ context }: ChatMessageRoomContextProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-4 text-[var(--app-muted)]">
      <Radio className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">Из комнаты {context.roomName}</span>
    </span>
  );
}
