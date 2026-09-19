import { AudioLines, MonitorUp, Plus, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  describeGroupNowRoom,
  formatGroupNowElapsed,
  resolveGroupNowRoomAction,
} from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";

import { GroupNowParticipant } from "./GroupNowParticipant";

const visibleParticipantLimit = 5;

function roomActionLabel(room: GroupNowRoom, action: ReturnType<typeof resolveGroupNowRoomAction>) {
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
  const activity = describeGroupNowRoom(room);
  const empty = room.participantCount === 0;
  const elapsed = action === "current" ? formatGroupNowElapsed(room.startedAt) : null;
  const visibleParticipants = room.participants.slice(0, visibleParticipantLimit);
  const overflowCount = room.participants.length - visibleParticipants.length;
  const canJoin = action !== "current" && !pending;
  const profileHandler = action === "current" ? onOpenProfile : undefined;

  const body = (
    <>
      <span className="voople-room-material__highlight" aria-hidden="true" />
      <span className="voople-room-material__reflection" aria-hidden="true" />

      <header className="relative z-[3] flex items-center justify-between gap-2">
        <span
          id={`group-now-room-${room.id}`}
          role="heading"
          aria-level={3}
          className="voople-group-now-room__name min-w-0 truncate font-semibold text-[var(--foreground)]"
        >
          {room.name}
        </span>
        <span className="voople-group-now-room__count flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px]">
          <UsersRound className="h-3 w-3" aria-hidden="true" />
          {room.participantCount}
        </span>
      </header>

      {empty ? (
        <div className="relative z-[3] flex min-h-0 flex-1 items-end">
          <p className="voople-group-now-room__empty text-[11px]">Пока пусто</p>
        </div>
      ) : (
        <div className="relative z-[3] flex min-h-0 flex-1 flex-col justify-between gap-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center" aria-label={`Участники комнаты ${room.name}`}>
              {visibleParticipants.map((participant, index) => (
                <span key={participant.id} className={cn(index > 0 && "-ml-2")}> 
                  <GroupNowParticipant user={participant} onOpenProfile={profileHandler} variant="room" />
                </span>
              ))}
              {overflowCount > 0 ? (
                <span className="voople-group-now-room__overflow -ml-1.5 grid h-10 min-w-10 place-items-center rounded-full px-1 text-[9px] font-semibold">
                  +{overflowCount}
                </span>
              ) : null}
            </div>
            <span
              className={cn(
                "voople-group-now-room__activity-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                room.hasScreenShare && "voople-group-now-room__activity-icon--screen",
              )}
              aria-hidden="true"
            >
              {room.hasScreenShare ? <MonitorUp className="h-4 w-4" /> : <AudioLines className="h-4 w-4" />}
            </span>
          </div>
          <p className={cn("truncate text-[12px] leading-4.5", action === "current" ? "voople-group-now-room__current-copy" : "text-[var(--app-muted)]")}>
            {action === "current" ? `Вы здесь${elapsed ? ` · ${elapsed}` : ""}` : activity}
          </p>
        </div>
      )}
    </>
  );

  const className = cn(
    "voople-room-material voople-group-now-room group relative flex w-full flex-col gap-4 overflow-hidden p-5 text-left xl:p-6",
    action === "current" && "voople-group-now-room--current",
    empty && "voople-group-now-room--empty",
    pending && "voople-group-now-room--pending",
  );

  if (!canJoin) {
    return (
      <section
        data-layout="room-section"
        data-room-kind={room.kind}
        className={className}
        aria-labelledby={`group-now-room-${room.id}`}
        aria-label={`${actionLabel}: ${room.name}`}
        aria-busy={pending || undefined}
      >
        {body}
      </section>
    );
  }

  return (
    <button
      type="button"
      data-layout="room-section"
      data-room-kind={room.kind}
      className={className}
      aria-labelledby={`group-now-room-${room.id}`}
      aria-label={`${actionLabel}: ${room.name}`}
      onClick={() => onJoinRoom(room)}
    >
      {body}
    </button>
  );
}

export function GroupNowCreateCard({
  pending,
  onCreateRoom,
  className,
}: {
  pending: boolean;
  onCreateRoom: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onCreateRoom}
      aria-label="Создать комнату и войти"
      className={cn(
        "voople-group-now-create-tile group flex w-full flex-col items-center justify-center gap-3 p-5 text-center disabled:opacity-55 xl:p-6",
        className,
      )}
    >
      <span className="voople-group-now-create-tile__plus grid h-9 w-9 place-items-center rounded-xl">
        <Plus className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-[12px] font-medium tracking-[-0.01em]">{pending ? "Создаём…" : "Создать комнату"}</span>
    </button>
  );
}
