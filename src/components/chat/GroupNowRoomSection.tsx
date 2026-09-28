import type { ReactNode } from "react";
import { ArrowRight, GitFork, MonitorUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveGroupNowRoomAction } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import type { VoiceSessionParticipants } from "@/types/voice-session-participants";
import { GroupNowParticipant } from "./GroupNowParticipant";

export function GroupNowRoomSection({ room, currentUserRoomId, pending, joinDisabled,
  onJoinRoom, onExpandCurrent, onCreateSplit, splitPending = false, onOpenProfile,
  sessionDetails, onVoop, moveStatus,
}: {
  room: GroupNowRoom;
  currentUserRoomId: string | null;
  pending: boolean;
  joinDisabled?: boolean;
  onJoinRoom: (room: GroupNowRoom) => void;
  onExpandCurrent?: (room: GroupNowRoom) => void;
  onCreateSplit?: () => void;
  splitPending?: boolean;
  onOpenProfile?: (user: GroupNowUser) => void;
  sessionDetails?: VoiceSessionParticipants | null;
  onVoop?: (user: GroupNowUser) => void;
  moveStatus?: ReactNode;
}) {
  const action = resolveGroupNowRoomAction(room.id, currentUserRoomId);
  const current = action === "current";
  const live = current && room.liveSessionId && sessionDetails?.sessionId === room.liveSessionId
    ? sessionDetails : null;
  const label = current ? "Открыть текущую комнату" : action === "switch" ? "Перейти в комнату" : "Войти в комнату";

  return (
    <section data-layout="room-section" data-room-kind={room.kind}
      className={cn("voople-group-now-room", current && "voople-group-now-room--current")}
      aria-labelledby={`group-now-room-${room.id}`} aria-busy={pending || undefined}>
      <header className="flex min-w-0 items-center gap-1">
        <button type="button" className="voople-group-now-room__header"
          disabled={pending || (!current && joinDisabled)}
          aria-label={`${label} ${room.name}`}
          onClick={() => current ? onExpandCurrent?.(room) : onJoinRoom(room)}>
          <span id={`group-now-room-${room.id}`} className="voople-group-now-room__name truncate">{room.name}</span>
          <span className="text-xs tabular-nums text-[var(--app-muted)]">{room.participantCount}</span>
          {room.hasScreenShare ? <MonitorUp className="h-4 w-4 shrink-0 text-[var(--app-muted)]" aria-label="В комнате показывают экран" /> : null}
          {room.kind === "temporary" ? <span className="sr-only">Временная комната</span> : null}
          <span className="ml-auto shrink-0 text-xs" role={pending ? "status" : undefined}>
            {pending ? "Подключаемся…" : current ? <span className="text-[var(--material-ice)]">Вы здесь</span> : (
              <span className="voople-group-now-room__action-cue">{action === "switch" ? "Перейти" : "Войти"}<ArrowRight className="h-3.5 w-3.5" /></span>
            )}
          </span>
        </button>
        {live && onCreateSplit ? (
          <button type="button" className="voople-group-now-room__split" disabled={pending || splitPending}
            aria-label="Отделиться во временную комнату" onClick={onCreateSplit}>
            <GitFork className="h-3.5 w-3.5" aria-hidden="true" />Сплит
          </button>
        ) : null}
      </header>
      {room.participants.length ? (
        <div className="voople-group-now__participants" aria-label={`Участники комнаты ${room.name}`}>
          {room.participants.map((user) => (
            <GroupNowParticipant key={user.id} user={user} onOpenProfile={onOpenProfile}
              detail={live?.participants[user.id]}
              onVolumeChange={live ? (volume) => live.setParticipantVolume(user.id, volume) : undefined}
              onVoop={live && !user.guest && !user.isMe && live.participants[user.id] && !live.participants[user.id].isMe ? onVoop : undefined}
              voopPending={splitPending} />
          ))}
        </div>
      ) : <p className="px-3 pb-3 text-xs text-[var(--app-muted)]">Пока пусто</p>}
      {current ? moveStatus : null}
    </section>
  );
}
