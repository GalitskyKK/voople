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
      data-layout="room-card"
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_72%,transparent)] px-3 py-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.5fr)_minmax(9rem,0.9fr)_auto] sm:items-center sm:px-4"
      aria-labelledby={`group-now-room-${room.id}`}
    >
      <div className="order-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h3
            id={`group-now-room-${room.id}`}
            className="voople-group-now-room__name truncate text-base font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]"
          >
            {room.name}
          </h3>
          <span className="voople-group-now-room__count shrink-0 font-mono text-[10px] text-[var(--app-muted)]">
            / {String(room.participantCount).padStart(2, "0")}
          </span>
        </div>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          {room.participantCount} в комнате
        </p>
      </div>

      <div
        className="order-3 col-span-2 flex min-h-12 min-w-0 flex-wrap items-start gap-1 sm:order-2 sm:col-span-1"
        aria-label={`Участники комнаты ${room.name}`}
      >
        {room.participants.length > 0 ? (
          room.participants.map((participant) => (
            <GroupNowParticipant
              key={participant.id}
              user={participant}
              onOpenProfile={onOpenProfile}
              variant="room"
            />
          ))
        ) : (
          <span className="self-center text-xs text-[var(--app-muted)]">
            Можно войти первым
          </span>
        )}
      </div>

      <p className="order-4 col-span-2 flex min-w-0 items-center gap-1.5 text-xs text-[var(--app-muted)] sm:order-3 sm:col-span-1">
        {room.hasScreenShare ? (
          <MonitorUp
            className="h-3.5 w-3.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <Radio
            className="h-3.5 w-3.5 shrink-0 text-[var(--theme-accent)]"
            aria-hidden="true"
          />
        )}
        <span className="truncate">{activity}</span>
      </p>

      <Button
        type="button"
        size="sm"
        variant={action === "current" ? "ghost" : "secondary"}
        disabled={pending || action === "current"}
        onClick={() => onJoinRoom(room)}
        aria-label={`${actionLabels[action]}: ${room.name}`}
        className="order-2 sm:order-4"
      >
        {pending ? "Подключаем" : actionLabels[action]}
      </Button>
    </section>
  );
}
