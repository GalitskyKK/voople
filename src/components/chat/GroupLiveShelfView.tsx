import { MonitorUp, Radio } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { resolveGroupNowRoomAction } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom } from "@/types/group-now";

const actionLabels = {
  join: "Зайти",
  switch: "Перейти",
  current: "Вы здесь",
} as const;

export function GroupLiveShelfView({
  rooms,
  currentUserRoomId,
  pendingRoomId,
  onJoinRoom,
}: {
  rooms: GroupNowRoom[];
  currentUserRoomId: string | null;
  pendingRoomId?: string | null;
  onJoinRoom: (room: GroupNowRoom) => void;
}) {
  const activeRooms = rooms.filter((room) => room.participantCount > 0);
  if (!activeRooms.length) return null;

  return (
    <section className="voople-group-live-shelf shrink-0 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,var(--theme-accent))] px-3 py-1.5" aria-labelledby="group-live-shelf-title">
      <div className="mx-auto flex min-h-8 w-full max-w-[960px] items-center gap-2">
        <h2 id="group-live-shelf-title" className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Сейчас</h2>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeRooms.map((room) => {
            const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
            return (
              <Button
                key={room.id}
                type="button"
                size="sm"
                variant={action === "current" ? "secondary" : "ghost"}
                className="h-8 max-w-56 shrink-0 gap-1.5 rounded-[var(--app-radius-sm)] px-2 text-xs"
                disabled={pendingRoomId === room.id}
                aria-busy={pendingRoomId === room.id}
                aria-current={action === "current" ? "true" : undefined}
                onClick={() => {
                  if (action !== "current") onJoinRoom(room);
                }}
                aria-label={`${actionLabels[action]}: ${room.name}${room.hasScreenShare ? ", идёт демонстрация" : ""}`}
              >
                <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                <strong className="min-w-0 truncate font-semibold uppercase tracking-[0.04em]">
                  {room.name}
                </strong>
                {room.hasScreenShare ? (
                  <MonitorUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                ) : null}
                <span className="shrink-0 font-mono text-[10px] text-[var(--app-muted)]">
                  {room.participantCount}
                </span>
                {action === "current" ? (
                  <span className="shrink-0 font-mono text-[9px] uppercase text-[var(--theme-accent)]">
                    вы
                  </span>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
