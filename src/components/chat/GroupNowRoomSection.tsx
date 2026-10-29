"use client";

import { useId, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, GitFork, LoaderCircle, LogIn, Maximize2, MonitorUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveGroupNowRoomAction } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom, GroupNowUser } from "@/types/group-now";
import type { VoiceSessionParticipants } from "@/types/voice-session-participants";
import { GroupNowParticipant } from "./GroupNowParticipant";
import { useInterfaceDesign } from "@/hooks/useInterfaceDesign";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { defaultRoomCover } from "@/lib/chat/room-cover";
import { RoomCoverVisual } from "./RoomCoverVisual";
import { RoomRosterDisclosure } from "./RoomRosterDisclosure";
import { RoomCoverEditor } from "./RoomCoverEditor";
import { OrbitRoomMenu } from "./OrbitRoomMenu";
import { useOrbitRoomFocus } from "./OrbitRoomFocus";

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
  const orbit = useInterfaceDesign() === "orbit";
  const coarsePointer = useCoarsePointer();
  const [touchInput, setTouchInput] = useState(false);
  const touchPreview = coarsePointer || touchInput;
  const [editingCover, setEditingCover] = useState(false);
  const coverEditId = useId();
  const focus = useOrbitRoomFocus();
  const current = action === "current";
  const expanded = orbit && focus?.expandedId === room.id;
  const live = current && room.liveSessionId && sessionDetails?.sessionId === room.liveSessionId
    ? sessionDetails : null;
  const label = current ? "Открыть текущую комнату" : action === "switch" ? "Перейти в комнату" : "Войти в комнату";
  const enter = () => current ? onExpandCurrent?.(room) : onJoinRoom(room);
  const activate = (event: MouseEvent<HTMLButtonElement>) => {
    const pointer = (event.nativeEvent as PointerEvent).pointerType;
    if (orbit && (pointer === "touch" || pointer !== "mouse" && coarsePointer && event.detail > 0)) {
      if (pointer === "touch") setTouchInput(true);
      focus?.select(room.id);
    }
    else enter();
  };

  return (
    <section data-layout="room-section" data-room-kind={room.kind}
      data-orbit-expanded={expanded}
      className={cn("voople-group-now-room", current && "voople-group-now-room--current")}
      aria-labelledby={`group-now-room-${room.id}`} aria-busy={pending || undefined}>
      <header className="flex min-w-0 items-center gap-1">
        <button type="button" className="voople-group-now-room__header"
          title={room.name}
          disabled={pending || (!current && joinDisabled)}
          aria-label={`${label} ${room.name}`}
          onClick={activate}>
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
        {!orbit && live && onCreateSplit ? (
          <button type="button" className="voople-group-now-room__split" disabled={pending || splitPending}
            aria-label="Отделиться во временную комнату" onClick={onCreateSplit}>
            <GitFork className="h-3.5 w-3.5" aria-hidden="true" />Сплит
          </button>
        ) : null}
      </header>
      {orbit ? <div className="voople-orbit-room__cover-wrap">
        <button type="button" className="voople-orbit-room__cover" disabled={pending || (!current && joinDisabled)}
          aria-label={`${label} ${room.name}`} onClick={activate}>
          <RoomCoverVisual cover={room.cover ?? defaultRoomCover(room.id)} />
          <span className="voople-orbit-room__entry" aria-hidden="true">{pending ? <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" /> : current ? <Maximize2 className="h-5 w-5" /> : <LogIn className="h-6 w-6" />}</span>
        </button>
        {touchPreview && expanded ? <button type="button" className="voople-orbit-room__touch-enter" disabled={pending || (!current && joinDisabled)} aria-label={`${label} ${room.name}`} onClick={enter}>
          {current ? <Maximize2 className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}{pending ? "Подключаемся…" : current ? "Открыть" : action === "switch" ? "Перейти" : "Войти"}
        </button> : null}
        <OrbitRoomMenu room={room} ownerId={coverEditId} current={current} pending={pending || Boolean(!current && joinDisabled)} splitPending={splitPending}
          onEnter={() => current ? onExpandCurrent?.(room) : onJoinRoom(room)} onSplit={live ? onCreateSplit : undefined}
          onEdit={() => { focus?.select(room.id); setEditingCover(true); }} />
      </div> : null}
      {room.participants.length || orbit ? (
        <RoomRosterDisclosure orbit={orbit} room={room} expanded={expanded} onPreview={() => focus?.select(expanded ? null : room.id)}
          status={orbit && current ? moveStatus : undefined}
          >
        <div className="voople-group-now__participants" aria-label={`Участники комнаты ${room.name}`}>
          {room.participants.map((user, index) => {
            const person = <GroupNowParticipant key={user.id} user={user} onOpenProfile={onOpenProfile}
              detail={live?.participants[user.id]}
              onVolumeChange={live ? (volume) => live.setParticipantVolume(user.id, volume) : undefined}
              onVoop={live && !user.guest && !user.isMe && live.participants[user.id] && !live.participants[user.id].isMe ? onVoop : undefined}
              voopPending={splitPending} />;
            return orbit ? <div key={user.id} className="voople-orbit-roster__person" style={{ "--person-index": index } as CSSProperties}>{person}</div> : person;
          })}
        </div>
        </RoomRosterDisclosure>
      ) : <p className="px-3 pb-3 text-xs text-[var(--app-muted)]">Пока пусто</p>}
      {current && !orbit ? moveStatus : null}
      {editingCover ? <RoomCoverEditor room={room} focusOwnerId={coverEditId} onClose={() => setEditingCover(false)} /> : null}
    </section>
  );
}
