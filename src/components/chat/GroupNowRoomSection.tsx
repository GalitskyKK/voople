import { MonitorUp, Radio, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  describeGroupNowRoom,
  resolveGroupNowRoomAction,
} from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";

import { GroupNowParticipant } from "./GroupNowParticipant";

function roomActionLabel(
  room: GroupNowRoom,
  action: ReturnType<typeof resolveGroupNowRoomAction>,
) {
  if (action === "current") return "Вы здесь";
  if (action === "switch") return room.kind === "lobby" ? "В Лобби" : "Перейти";
  if (room.kind !== "lobby") return "Зайти";
  return room.participantCount > 0 ? "Присоединиться" : "Начать разговор";
}

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
  const actionLabel = roomActionLabel(room, action);
  const mobileActionLabel = room.kind === "lobby" && action === "join"
    ? room.participantCount > 0 ? "Зайти" : "Начать"
    : actionLabel;
  const activity = describeGroupNowRoom(room);

  return (
    <section
      data-layout="room-section"
      className="voople-group-now-room grid grid-cols-[minmax(5.5rem,0.8fr)_minmax(0,1.2fr)_auto] gap-x-3 gap-y-2 border-b border-[var(--app-border)] px-3 py-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.5fr)_minmax(9rem,0.9fr)_auto] sm:items-center sm:gap-y-3 sm:px-4"
      aria-labelledby={`group-now-room-${room.id}`}
    >
      <div className="order-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h3
            id={`group-now-room-${room.id}`}
            className="voople-group-now-room__name truncate text-base font-semibold text-[var(--foreground)]"
          >
            {room.name}
          </h3>
        </div>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          {room.kind === "lobby" ? "Общий разговор · " : ""}
          {room.participantCount} в голосе
        </p>
      </div>

      <div
        className="order-2 col-span-1 flex min-h-12 min-w-0 flex-nowrap items-start gap-1 overflow-hidden sm:order-2 sm:flex-wrap sm:overflow-visible"
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

      <p className="order-4 col-span-3 flex min-w-0 items-center gap-1.5 text-xs text-[var(--app-muted)] sm:order-3 sm:col-span-1">
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
        variant="ghost"
        disabled={pending || action === "current"}
        onClick={() => onJoinRoom(room)}
        aria-label={`${actionLabel}: ${room.name}`}
        className={cn(
          "order-3 rounded-[var(--app-radius-sm)] border sm:order-4",
          action === "current"
            ? "border-[var(--app-border)] text-[var(--app-muted)]"
            : "border-[color-mix(in_srgb,var(--theme-accent)_72%,var(--app-border))] text-[var(--theme-accent)] hover:border-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]",
        )}
      >
        {pending ? "Подключаем" : (
          <>
            <span className="sm:hidden">{mobileActionLabel}</span>
            <span className="hidden sm:inline">{actionLabel}</span>
          </>
        )}
      </Button>
    </section>
  );
}
