import { LoaderCircle, Plus, RefreshCw, UsersRound, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatGroupNowVoiceSummary } from "@/lib/chat/group-now-presentation";
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
  const rooms = props.value.rooms.filter((room) => room.kind !== "lobby");
  const voiceSummary = formatGroupNowVoiceSummary(props.value.rooms);
  const surfaceError = props.actionError ?? props.createError;
  return (
    <section
      className="mr-auto w-full max-w-[960px] px-3 py-4 text-[var(--foreground)] sm:px-6 sm:py-5"
      aria-labelledby="group-now-title"
    >
      <header className="flex min-h-11 items-center justify-between gap-4 border-b border-[var(--app-border)] pb-3">
        <div className="min-w-0">
          <h2 id="group-now-title" className="voople-group-now__title truncate text-sm font-semibold">
            {voiceSummary}
          </h2>
        </div>
        {props.onCreateRoom ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={props.createPending}
            onClick={props.onCreateRoom}
            aria-label="Создать комнату и войти"
            className="voople-group-now__create shrink-0 rounded-[var(--app-radius-sm)] border border-[var(--app-border)] text-[var(--theme-accent)] hover:border-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {props.createPending ? "Создаём" : "Комната"}
          </Button>
        ) : null}
      </header>

      {surfaceError ? (
        <p className="mt-4 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm" role="alert">
          {surfaceError}
        </p>
      ) : null}

      {lobby ? (
        <div className="voople-group-now__lobby mt-3 border-t border-[var(--app-border)]">
          <GroupNowRoomSection
            room={lobby}
            currentUserRoomId={props.value.currentUserRoomId}
            pending={props.pendingRoomId === lobby.id}
            onJoinRoom={props.onJoinRoom}
            onOpenProfile={props.onOpenProfile}
          />
        </div>
      ) : null}

      {rooms.length > 0 ? (
        <section className="voople-group-now__rooms" aria-labelledby="group-now-rooms-title">
          <h3
            id="group-now-rooms-title"
            className="border-b border-[var(--app-border)] px-3 py-2 text-xs font-semibold text-[var(--app-muted)] sm:px-4"
          >
            Комнаты · {rooms.length}
          </h3>
          {rooms.map((room) => (
            <GroupNowRoomSection
              key={room.id}
              room={room}
              currentUserRoomId={props.value.currentUserRoomId}
              pending={props.pendingRoomId === room.id}
              onJoinRoom={props.onJoinRoom}
              onOpenProfile={props.onOpenProfile}
            />
          ))}
        </section>
      ) : null}

      {props.value.onlineOutsideRooms.length > 0 ? (
        <section className="border-b border-[var(--app-border)] py-4" aria-labelledby="group-now-online-title">
          <h3 id="group-now-online-title" className="flex items-center gap-2 text-sm font-semibold">
            <UsersRound className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
            В сети · {props.value.onlineOutsideRooms.length}
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            {props.value.onlineOutsideRooms.map((user) => (
              <GroupNowParticipant key={user.id} user={user} onOpenProfile={props.onOpenProfile} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function GroupNowPassiveState(props: PassiveStateProps) {
  const offline = props.mode === "offline";
  const loading = props.mode === "loading";
  const title = loading ? "Загружаем голосовые комнаты" : offline ? "Нет соединения" : "Не удалось открыть голосовые комнаты";
  const message = loading
    ? "Собираем, кто и где сейчас общается."
    : props.message ?? (offline
      ? "Сессия сохранена. Комнаты появятся после восстановления сети."
      : "Повторите загрузку — текущий разговор не изменится.");

  return (
    <section
      className="mr-auto flex min-h-72 w-full max-w-[960px] items-center justify-center px-4 py-8 text-[var(--foreground)]"
      aria-labelledby="group-now-state-title"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">
          {loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : offline ? (
            <WifiOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-muted)]">
          {props.groupName}
        </p>
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
