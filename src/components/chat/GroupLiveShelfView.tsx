import { MonitorUp, Radio } from "lucide-react";

import { GroupAvatar } from "@/components/chat/GroupAvatar";
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
    <section className="voople-group-live-shelf shrink-0 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_94%,var(--theme-accent))] px-3 py-2" aria-labelledby="group-live-shelf-title">
      <div className="mx-auto w-full max-w-[960px]">
        <h2 id="group-live-shelf-title" className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Сейчас</h2>
        <div className="divide-y divide-[var(--app-border)]">
          {activeRooms.map((room) => {
            const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
            return (
              <div key={room.id} className="flex min-h-11 items-center gap-3 py-1.5">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <strong className="max-w-36 truncate text-xs font-semibold uppercase tracking-[0.06em]">{room.name}</strong>
                  <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
                    {room.participants.slice(0, 4).map((participant) => (
                      <span key={participant.id} className="flex min-w-0 items-center gap-1">
                        <GroupAvatar name={participant.displayName} avatarUrl={participant.avatarUrl} size="sm" shape="square" />
                        <span className="max-w-20 truncate text-[11px] text-[var(--app-muted)]">{participant.displayName}</span>
                      </span>
                    ))}
                  </span>
                </span>
                {room.hasScreenShare ? <span className="hidden items-center gap-1 text-[11px] text-emerald-400 md:inline-flex"><MonitorUp className="h-3.5 w-3.5" aria-hidden="true" /> экран</span> : null}
                <span className="font-mono text-[11px] text-[var(--app-muted)]">{room.participantCount}</span>
                <Button type="button" size="sm" variant={action === "current" ? "ghost" : "secondary"} disabled={pendingRoomId === room.id || action === "current"} onClick={() => onJoinRoom(room)} aria-label={`${actionLabels[action]}: ${room.name}`}>
                  {pendingRoomId === room.id ? "Подключаем" : actionLabels[action]}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
