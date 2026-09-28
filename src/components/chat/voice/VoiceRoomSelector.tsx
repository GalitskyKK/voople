"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LoaderCircle, Mic2, MonitorUp, RefreshCw } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { GroupNowRoom } from "@/types/group-now";

import { VoiceRoomActionsMenu } from "./VoiceRoomActionsMenu";
import type { VoiceRoomSwitcherModel } from "./voice-room-sheet-models";

function useMobileRoomPicker() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return mobile;
}

function RoomSignal({ room }: { room: GroupNowRoom }) {
  if (room.hasScreenShare) {
    return <MonitorUp className="h-4 w-4" aria-label="Идёт демонстрация экрана" />;
  }
  if (room.participantCount > 0) {
    return <Mic2 className="h-4 w-4" aria-label="Есть участники" />;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" aria-label="Комната свободна" />;
}

function RoomPickerContent({
  model,
  onChoose,
}: {
  model: VoiceRoomSwitcherModel;
  onChoose: (room: GroupNowRoom) => void;
}) {
  return (
    <div className="voople-full-room__room-picker-list min-w-0 py-1">
      {model.rooms.map((room, index) => {
        const current = room.id === model.currentRoomId;
        const pending = room.id === model.pendingRoomId;
        return (
          <div
            key={room.id}
            className={cn(
              "group/room-option flex min-h-12 items-center rounded-[var(--app-radius-md)] border border-transparent",
              current && "border-[var(--app-border)] bg-[var(--app-accent-soft)]",
            )}
          >
            <button
              type="button"
              data-dropdown-autofocus={index === 0 ? "" : undefined}
              aria-current={current ? "true" : undefined}
              aria-busy={pending || undefined}
              disabled={current || model.pendingRoomId !== null}
              onClick={() => onChoose(room)}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left outline-none transition hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-accent-soft)] disabled:cursor-default"
            >
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center text-[var(--app-muted)]", current && "text-[var(--theme-accent)]")}>
                {pending
                  ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-label="Переход" />
                  : <RoomSignal room={room} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-4">{room.name}</span>
                <span className="mt-0.5 block text-xs leading-4 tabular-nums text-[var(--app-muted)]">
                  {current ? "Вы здесь" : room.participantCount > 0 ? `${room.participantCount} в комнате` : "Свободно"}
                </span>
              </span>
            </button>
            {model.management && room.canManage && room.kind !== "lobby" ? (
              <div className="pr-2">
                <VoiceRoomActionsMenu room={room} management={model.management} />
              </div>
            ) : null}
          </div>
        );
      })}

      {model.errorMessage ? (
        <div className="border-t border-[var(--app-border)] px-3 py-2" role="alert">
          <p className="text-xs leading-4 text-[var(--app-muted)]">{model.errorMessage}</p>
          <button type="button" onClick={() => void model.onRetry()} className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-[var(--theme-accent)] hover:underline">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Повторить
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function VoiceRoomSelector({ model }: { model: VoiceRoomSwitcherModel }) {
  const [open, setOpen] = useState(false);
  const mobile = useMobileRoomPicker();
  const currentRoom = model.rooms.find((room) => room.id === model.currentRoomId) ?? model.rooms[0];
  const lobby = model.rooms.find((room) => room.kind === "lobby");
  if (!currentRoom) return null;

  const choose = (room: GroupNowRoom) => {
    setOpen(false);
    void model.onSelect(room);
  };
  const trigger = (
    <button
      type="button"
      aria-label={`Выбрать комнату. Сейчас: ${currentRoom.name}`}
      aria-expanded={open}
      disabled={Boolean(model.pendingRoomId)}
      className="flex min-h-9 min-w-0 max-w-52 items-center gap-2 border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 text-left text-[var(--foreground)] outline-none transition hover:bg-[var(--app-surface-soft)] focus-visible:border-[var(--theme-accent)] disabled:cursor-wait disabled:opacity-50"
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      {model.pendingRoomId
        ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        : <RoomSignal room={currentRoom} />}
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{currentRoom.name}</span>
      <span className="text-xs tabular-nums text-[var(--app-muted)]">{currentRoom.participantCount}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" aria-hidden="true" />
    </button>
  );

  return (
    <div className="voople-full-room__room-selector mt-1 min-w-0 items-center gap-2">
      {mobile ? (
        <>
          {trigger}
          <Sheet open={open} onClose={() => setOpen(false)} placement="bottom" ariaLabel="Комнаты группы" className="voople-full-room__room-picker-sheet p-0 pt-12">
            <h2 className="px-3 pb-2 text-sm font-semibold">Комнаты группы</h2>
            <RoomPickerContent model={model} onChoose={choose} />
          </Sheet>
        </>
      ) : (
        <DropdownMenu
          open={open}
          onOpenChange={setOpen}
          align="start"
          contentRole="dialog"
          ariaLabel="Комнаты группы"
          menuClassName="w-72 rounded-[var(--app-radius-sm)] p-0"
          trigger={trigger}
        >
          <RoomPickerContent model={model} onChoose={choose} />
        </DropdownMenu>
      )}

      {lobby && currentRoom.kind !== "lobby" ? (
        <button
          type="button"
          disabled={Boolean(model.pendingRoomId)}
          onClick={() => choose(lobby)}
          className="min-h-9 shrink-0 border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--theme-accent)] transition hover:bg-[var(--app-accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-wait disabled:opacity-50"
          aria-label="Перейти в Лобби"
        >
          В Лобби
        </button>
      ) : null}
    </div>
  );
}
