import { MonitorUp, Radio, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  describeGroupNowRoom,
  resolveGroupNowRoomAction,
} from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";

import { GroupNowParticipant } from "./GroupNowParticipant";

const actionLabels = {
  join: "Зайти",
  switch: "Перейти",
  current: "Вы здесь",
} as const;

export function GroupNowRoomSection({
  room,
  currentUserRoomId,
  pending,
  onJoinRoom,
  onOpenProfile,
}: {
  room: GroupNowRoom;
  currentUserRoomId: string | null;
  pending: boolean;
  onJoinRoom: (room: GroupNowRoom) => void;
  onOpenProfile?: (user: GroupNowUser) => void;
}) {
  const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
  const activity = describeGroupNowRoom(room);

  return (
    <section
      className="border-b border-[var(--app-border)] py-4 last:border-b-0"
      aria-labelledby={`group-now-room-${room.id}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              id={`group-now-room-${room.id}`}
              className="truncate text-sm font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]"
            >
              {room.name}
            </h3>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--app-muted)]">
              <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
              {room.participantCount}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
            {room.hasScreenShare ? (
              <MonitorUp className="h-3.5 w-3.5 text-[var(--theme-accent)]" aria-hidden="true" />
            ) : (
              <Radio className="h-3.5 w-3.5 text-[var(--theme-accent)]" aria-hidden="true" />
            )}
            <span className="truncate">{activity}</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={action === "current" ? "ghost" : "secondary"}
          disabled={pending || action === "current"}
          onClick={() => onJoinRoom(room)}
          aria-label={`${actionLabels[action]}: ${room.name}`}
        >
          {pending ? "Подключаем" : actionLabels[action]}
        </Button>
      </div>

      {room.participants.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2" aria-label={`Участники комнаты ${room.name}`}>
          {room.participants.map((participant) => (
            <GroupNowParticipant
              key={participant.id}
              user={participant}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
