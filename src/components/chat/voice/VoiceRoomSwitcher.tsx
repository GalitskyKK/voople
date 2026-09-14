"use client";

import { LoaderCircle, Mic2, MonitorUp, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GroupNowRoom } from "@/types/group-now";

import { VoiceRoomActionsMenu } from "./VoiceRoomActionsMenu";
import type { VoiceRoomSwitcherModel } from "./voice-room-sheet-models";

function RoomSignal({ room }: { room: GroupNowRoom }) {
  if (room.hasScreenShare) {
    return <MonitorUp className="h-3.5 w-3.5" aria-label="Идёт демонстрация экрана" />;
  }
  if (room.participantCount > 0) {
    return <Mic2 className="h-3.5 w-3.5" aria-label="Есть участники" />;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" aria-label="Комната свободна" />;
}

export function VoiceRoomSwitcher({
  rooms,
  currentRoomId,
  pendingRoomId,
  errorMessage,
  refreshing,
  onSelect,
  onRetry,
  management,
}: VoiceRoomSwitcherModel) {
  return (
    <aside className="voople-full-room__switcher shrink-0 border-r border-[var(--app-border)] bg-[var(--background)]" aria-label="Комнаты группы">
      <div className="voople-full-room__switcher-heading flex items-center justify-between gap-2 border-b border-[var(--app-border)] px-3 py-3">
        <p className="text-xs font-semibold uppercase leading-4 tracking-[0.1em] text-[var(--app-muted)]">Комнаты</p>
        {refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--app-muted)] motion-reduce:animate-none" aria-label="Обновление комнат" /> : null}
      </div>

      <div className="voople-full-room__switcher-list min-h-0 overflow-y-auto p-2">
        {rooms.map((room) => {
          const current = room.id === currentRoomId;
          const pending = room.id === pendingRoomId;
          return (
            <div
              key={room.id}
              className={cn(
                "group/room voople-full-room__switcher-room flex min-h-12 w-full min-w-0 items-center border-l-2 border-transparent transition hover:bg-[var(--app-surface-soft)]",
                current && "border-l-[var(--theme-accent)] bg-[var(--app-surface-soft)]",
              )}
            >
              <button
                type="button"
                aria-current={current ? "true" : undefined}
                aria-busy={pending || undefined}
                disabled={current || pendingRoomId !== null}
                onClick={() => void onSelect(room)}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)] disabled:cursor-default"
              >
                <span className={cn("shrink-0 text-[var(--app-muted)]", current && "text-[var(--theme-accent)]")}>
                  {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-label="Переход" /> : <RoomSignal room={room} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold uppercase leading-4 tracking-[0.035em]">{room.name}</span>
                  <span className="mt-0.5 block text-xs leading-4 tabular-nums text-[var(--app-muted)]">
                    {current ? "Вы здесь" : room.participantCount > 0 ? `${room.participantCount} в комнате` : "Свободно"}
                  </span>
                </span>
              </button>
              {management && room.canManage && room.kind !== "lobby" ? (
                <div className="pr-1 opacity-60 transition group-focus-within/room:opacity-100 group-hover/room:opacity-100 motion-reduce:transition-none md:opacity-0">
                  <VoiceRoomActionsMenu room={room} management={management} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {errorMessage ? (
        <div className="voople-full-room__switcher-error border-t border-[var(--app-border)] p-3" role="alert">
          <p className="text-xs leading-4 text-[var(--app-muted)]">{errorMessage}</p>
          <button type="button" onClick={() => void onRetry()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--theme-accent)] hover:underline">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Повторить
          </button>
        </div>
      ) : null}
    </aside>
  );
}
