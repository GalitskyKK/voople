import { LoaderCircle, Plus, RefreshCw, UsersRound, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { isGroupNowQuiet } from "@/lib/chat/group-now-presentation";
import type { GroupNowRoom, GroupNowUser, GroupNowView } from "@/types/group-now";

import { GroupNowParticipant } from "./GroupNowParticipant";
import { GroupNowRoomSection } from "./GroupNowRoomSection";

type PassiveStateProps = {
  mode: "loading" | "offline" | "error";
  groupName: string;
  message?: string;
  onRetry?: () => void;
};

type ReadyStateProps = {
  mode: "ready";
  value: GroupNowView;
  pendingRoomId?: string | null;
  actionError?: string | null;
  onJoinRoom: (room: GroupNowRoom) => void;
  onCreateRoom?: () => void;
  onOpenProfile?: (user: GroupNowUser) => void;
};

export type GroupNowPanelViewProps = PassiveStateProps | ReadyStateProps;

export function GroupNowPanelView(props: GroupNowPanelViewProps) {
  if (props.mode !== "ready") {
    return <GroupNowPassiveState {...props} />;
  }

  const quiet = isGroupNowQuiet(props.value.rooms);
  return (
    <section
      className="mx-auto w-full max-w-[960px] px-4 py-5 text-[var(--foreground)] sm:px-6"
      aria-labelledby="group-now-title"
    >
      <header className="flex items-end justify-between gap-4 border-b border-[var(--app-border)] pb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--theme-accent)]">
            Сейчас
          </p>
          <h2 id="group-now-title" className="mt-1 truncate text-xl font-semibold">
            {props.value.groupName}
          </h2>
        </div>
        <span className="shrink-0 text-sm text-[var(--app-muted)]">
          {props.value.visibleOnlineCount} онлайн
        </span>
      </header>

      {quiet ? (
        <div className="border-b border-[var(--app-border)] py-4" role="status">
          <p className="text-sm font-medium">Сейчас тихо</p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            Можно зайти в Лобби или создать комнату — участники увидят, что вы на связи.
          </p>
        </div>
      ) : null}

      {props.actionError ? (
        <p className="mt-4 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm" role="alert">
          {props.actionError}
        </p>
      ) : null}

      <div>
        {props.value.rooms.map((room) => (
          <GroupNowRoomSection
            key={room.id}
            room={room}
            currentUserRoomId={props.value.currentUserRoomId}
            pending={props.pendingRoomId === room.id}
            onJoinRoom={props.onJoinRoom}
            onOpenProfile={props.onOpenProfile}
          />
        ))}
      </div>

      {props.value.onlineOutsideRooms.length > 0 ? (
        <section className="border-b border-[var(--app-border)] py-4" aria-labelledby="group-now-online-title">
          <h3 id="group-now-online-title" className="flex items-center gap-2 text-sm font-semibold">
            <UsersRound className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
            Онлайн
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            {props.value.onlineOutsideRooms.map((user) => (
              <GroupNowParticipant key={user.id} user={user} onOpenProfile={props.onOpenProfile} />
            ))}
          </div>
        </section>
      ) : null}

      {props.onCreateRoom ? (
        <button
          type="button"
          onClick={props.onCreateRoom}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[var(--theme-accent)] transition hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Комната
        </button>
      ) : null}
    </section>
  );
}

function GroupNowPassiveState(props: PassiveStateProps) {
  const offline = props.mode === "offline";
  const loading = props.mode === "loading";
  const title = loading ? "Загружаем комнаты" : offline ? "Нет соединения" : "Не удалось открыть комнаты";
  const message = loading
    ? "Собираем, кто и где сейчас общается."
    : props.message ?? (offline
      ? "Сессия сохранена. Комнаты появятся после восстановления сети."
      : "Повторите загрузку — текущий разговор не изменится.");

  return (
    <section
      className="mx-auto flex min-h-72 w-full max-w-[960px] items-center justify-center px-4 py-8 text-[var(--foreground)]"
      aria-labelledby="group-now-state-title"
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
