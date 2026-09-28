import type { ReactNode } from "react";
import type { VoiceSessionParticipants } from "@/types/voice-session-participants";
import { Plus, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { GroupNowRoom, GroupNowUser, GroupNowView } from "@/types/group-now";

import { GroupNowParticipant } from "./GroupNowParticipant";
import { GroupNowRoomSection } from "./GroupNowRoomSection";
import { GroupLiveShelfView } from "./GroupLiveShelfView";

type PassiveStateProps = {
  mode: "loading" | "offline" | "error";
  groupName: string;
  variant?: "surface" | "shelf";
  message?: string;
  onRetry?: () => void;
};

type ReadyStateProps = {
  mode: "ready";
  value: GroupNowView;
  variant?: "surface" | "shelf";
  pendingRoomId?: string | null;
  actionError?: string | null;
  createPending?: boolean;
  createError?: string | null;
  onJoinRoom: (room: GroupNowRoom) => void;
  onLeaveCurrent?: (room: GroupNowRoom) => void;
  onExpandCurrent?: (room: GroupNowRoom) => void;
  leavePending?: boolean;
  onCreateSplit?: () => void;
  onCreateRoom?: () => void;
  sessionDetails?: VoiceSessionParticipants | null;
  onVoop?: (user: GroupNowUser) => void;
  splitPending?: boolean;
  moveStatus?: ReactNode;
  onOpenProfile?: (user: GroupNowUser) => void;
};

export type GroupNowPanelViewProps = PassiveStateProps | ReadyStateProps;

export function GroupNowPanelView(props: GroupNowPanelViewProps) {
  if (props.mode !== "ready") {
    if (props.variant === "shelf") return null;
    return <GroupNowPassiveState {...props} />;
  }

  if (props.variant === "shelf") {
    return (
      <GroupLiveShelfView
        groupId={props.value.groupId}
        rooms={props.value.rooms}
        currentUserRoomId={props.value.currentUserRoomId}
        pendingRoomId={props.pendingRoomId}
        onJoinRoom={props.onJoinRoom}
        onExpandCurrent={props.onExpandCurrent}
      />
    );
  }

  const lobby = props.value.rooms.find((room) => room.kind === "lobby") ?? null;
  const persistentRooms = [
    ...(lobby ? [lobby] : []),
    ...props.value.rooms.filter((room) => room.kind === "pinned"),
  ];
  const temporaryRooms = props.value.rooms.filter((room) => room.kind === "temporary" && room.participantCount > 0);
  const renderRoom = (room: GroupNowRoom) => <GroupNowRoomSection key={room.id} room={room}
    currentUserRoomId={props.value.currentUserRoomId} pending={props.pendingRoomId === room.id}
    joinDisabled={Boolean(props.pendingRoomId)} onJoinRoom={props.onJoinRoom}
    onExpandCurrent={props.onExpandCurrent} onCreateSplit={props.onCreateSplit}
    splitPending={props.splitPending} onOpenProfile={props.onOpenProfile}
    sessionDetails={props.sessionDetails} onVoop={props.onVoop} moveStatus={props.moveStatus} />;
  const surfaceError = props.actionError ?? props.createError;
  const onlineCount = props.value.onlineOutsideRooms.length;

  return (
    <section className="voople-group-now min-h-full w-full min-w-0 px-5 py-6 text-[var(--foreground)] md:px-6 xl:px-7" aria-label="Голосовые комнаты группы">
      {surfaceError ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300" role="alert">
          {surfaceError}
        </p>
      ) : null}

      <section aria-label="Комнаты">
        <header className="voople-group-now__section-header flex items-center justify-between gap-3">
          <h2 className="font-semibold">Комнаты</h2>
          {props.onCreateRoom ? <button type="button" className="voople-group-now__create"
            aria-label="Создать постоянную комнату" disabled={props.createPending} onClick={props.onCreateRoom}>
            <Plus className="h-4 w-4" aria-hidden="true" />{props.createPending ? "Создаём…" : "Комната"}
          </button> : null}
        </header>
        <div className="voople-group-now__rooms">{persistentRooms.map(renderRoom)}</div>
      </section>
      {temporaryRooms.length ? <section className="mt-6" aria-label="Временные комнаты">
        <h2 className="voople-group-now__section-header text-sm font-semibold text-[var(--app-muted)]">Временные · {temporaryRooms.length}</h2>
        <div className="voople-group-now__rooms">{temporaryRooms.map(renderRoom)}</div>
      </section> : null}

      <section className="voople-group-now__online mt-8" aria-labelledby="group-now-online-title">
        <header className="voople-group-now__section-header mb-3 flex items-center gap-2">
          <h3 id="group-now-online-title" className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">Доступны</h3>
          <span className="voople-group-now__section-count rounded-md px-2.5 py-0.5 text-xs leading-4 text-[var(--app-muted)]">· {onlineCount}</span>
        </header>
        {props.value.onlineOutsideRooms.length > 0 ? (
          <div className="voople-group-now__participants voople-group-now__available">
            {props.value.onlineOutsideRooms.map((user) => (
              <GroupNowParticipant key={user.id} user={user} onOpenProfile={props.onOpenProfile} />
            ))}
          </div>
        ) : (
          <p className="text-xs leading-5 text-[var(--app-muted)]">Сейчас все уже в разговорах или офлайн.</p>
        )}
      </section>
    </section>
  );
}

function GroupNowPassiveState(props: PassiveStateProps) {
  const offline = props.mode === "offline";
  const loading = props.mode === "loading";
  if (loading) {
    return (
      <section className="flex w-full flex-col gap-4 px-4 py-6 sm:px-6" role="status" aria-label="Загружаем комнаты" aria-busy="true">
        {[0, 1].map((item) => (
          <div key={item} className="space-y-3 border-b border-[var(--app-border)] py-4">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-2">
              <Skeleton shape="avatar" className="h-10 w-10" />
              <Skeleton shape="avatar" className="h-10 w-10" />
            </div>
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </section>
    );
  }
  const title = offline ? "Нет соединения" : "Не удалось открыть голос";
  const message = props.message ?? (offline ? "Сессия сохранена. Комнаты появятся после восстановления сети." : "Повторите загрузку — текущий разговор не изменится.");

  return (
    <section className="flex min-h-72 w-full items-center justify-center px-4 py-8 text-[var(--foreground)]" aria-labelledby="group-now-state-title" role="status" aria-live="polite">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">
          {offline ? <WifiOff className="h-5 w-5" aria-hidden="true" /> : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
        </span>
        <p className="mt-4 text-xs text-[var(--app-muted)]">{props.groupName}</p>
        <h2 id="group-now-state-title" className="mt-1 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{message}</p>
        {props.onRetry ? (
          <Button className="mt-5" type="button" variant="secondary" onClick={props.onRetry} disabled={offline}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {offline ? "Ждём сеть" : "Повторить"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
