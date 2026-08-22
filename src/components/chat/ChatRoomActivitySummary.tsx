import { Clock3 } from "lucide-react";

import { formatRoomDuration } from "@/lib/chat/message-content";

export function ChatRoomActivitySummary({ dayLabel, durationSeconds, sessions }: {
  dayLabel: string;
  durationSeconds: number;
  sessions: number;
}) {
  return (
    <div className="my-3 flex w-full items-center justify-center gap-2 px-4 text-[11px] text-[var(--app-muted)]" role="status">
      <span className="h-px max-w-20 flex-1 bg-[var(--app-border)]" />
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5">
        <Clock3 className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
        <span>{dayLabel} в комнате общались {formatRoomDuration(durationSeconds)}{sessions > 1 ? ` · ${sessions} встречи` : ""}</span>
      </span>
      <span className="h-px max-w-20 flex-1 bg-[var(--app-border)]" />
    </div>
  );
}
