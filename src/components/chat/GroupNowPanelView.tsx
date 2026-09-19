import { LoaderCircle, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { GroupNowRoom, GroupNowUser, GroupNowView } from "@/types/group-now";

import { GroupNowParticipant } from "./GroupNowParticipant";
import { GroupNowCreateCard, GroupNowRoomSection } from "./GroupNowRoomSection";
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
  onCreateRoom?: () => void;
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
      />
    );
  }

  const lobby = props.value.rooms.find((room) => room.kind === "lobby") ?? null;
  const otherRooms = props.value.rooms.filter((room) => room.kind !== "lobby");
  const visibleRooms = lobby ? [lobby, ...otherRooms] : otherRooms;
  const surfaceError = props.actionError ?? props.createError;
  const onlineCount = props.value.visibleOnlineCount || props.value.onlineOutsideRooms.length;

  return (
    <section className="voople-group-now min-h-full w-full min-w-0 px-5 py-6 text-[var(--foreground)] md:px-6 xl:px-7" aria-labelledby="group-now-voice-title">
      {surfaceError ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300" role="alert">
          {surfaceError}
        </p>
      ) : null}

      <section aria-labelledby="group-now-voice-title">
        <header className="voople-group-now__section-header mb-3 flex items-center gap-2">
          <h2 id="group-now-voice-title" className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">Голос</h2>
          <span className="voople-group-now__section-count rounded-md px-2.5 py-0.5 text-[10px] text-[var(--app-muted)]">
            {formatRoomCount(visibleRooms.length)}
          </span>
        </header>

        <div className="voople-group-now__grid">
          {visibleRooms.map((room) => (
            <GroupNowRoomSection
              key={room.id}
              room={room}
              currentUserRoomId={props.value.currentUserRoomId}
              pending={props.pendingRoomId === room.id}
              onJoinRoom={props.onJoinRoom}
              onOpenProfile={props.onOpenProfile}
            />
          ))}
          {props.onCreateRoom ? (
            <GroupNowCreateCard pending={Boolean(props.createPending)} onCreateRoom={props.onCreateRoom} />
          ) : null}
        </div>
      </section>

      <section className="voople-group-now__online mt-8" aria-labelledby="group-now-online-title">
        <header className="voople-group-now__section-header mb-3 flex items-center gap-2">
          <h3 id="group-now-online-title" className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">Доступны</h3>
          <span className="voople-group-now__section-count rounded-md px-2.5 py-0.5 text-[10px] text-[var(--app-muted)]">{onlineCount} онлайн</span>
        </header>
        {props.value.onlineOutsideRooms.length > 0 ? (
          <div className="voople-group-now__available flex flex-wrap gap-x-5 gap-y-3">
            {props.value.onlineOutsideRooms.map((user) => (
              <GroupNowParticipant key={user.id} user={user} onOpenProfile={props.onOpenProfile} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--app-muted)]">Сейчас все уже в разговорах или офлайн.</p>
        )}
      </section>
    </section>
  );
}

function GroupNowPassiveState(props: PassiveStateProps) {
  const offline = props.mode === "offline";
  const loading = props.mode === "loading";
  const title = loading ? "Загружаем голос" : offline ? "Нет соединения" : "Не удалось открыть голос";
  const message = loading
    ? "Собираем текущие разговоры группы."
    : props.message ?? (offline ? "Сессия сохранена. Комнаты появятся после восстановления сети." : "Повторите загрузку — текущий разговор не изменится.");

  return (
    <section className="flex min-h-72 w-full items-center justify-center px-4 py-8 text-[var(--foreground)]" aria-labelledby="group-now-state-title" role="status" aria-live="polite">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">
          {loading ? <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : offline ? <WifiOff className="h-5 w-5" aria-hidden="true" /> : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
        </span>
        <p className="mt-4 text-xs text-[var(--app-muted)]">{props.groupName}</p>
        <h2 id="group-now-state-title" className="mt-1 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{message}</p>
        {!loading && props.onRetry ? (
          <Button className="mt-5" type="button" variant="secondary" onClick={props.onRetry} disabled={offline}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {offline ? "Ждём сеть" : "Повторить"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function formatRoomCount(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const noun = mod100 >= 11 && mod100 <= 14 ? "комнат" : mod10 === 1 ? "комната" : mod10 >= 2 && mod10 <= 4 ? "комнаты" : "комнат";
  return `${count} ${noun}`;
}
