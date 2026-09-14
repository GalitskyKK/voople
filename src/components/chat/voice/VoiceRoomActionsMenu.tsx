"use client";

import { useState, type FormEvent } from "react";
import { Archive, EllipsisVertical, LoaderCircle, Pencil, Pin, PinOff } from "lucide-react";

import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { IconButton } from "@/components/ui/IconButton";
import type { GroupNowRoom } from "@/types/group-now";

import type { VoiceRoomManagementModel } from "./voice-room-sheet-models";

type MenuMode = "actions" | "rename" | "archive";

export function VoiceRoomActionsMenu({
  room,
  management,
}: {
  room: GroupNowRoom;
  management: VoiceRoomManagementModel;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MenuMode>("actions");
  const [draft, setDraft] = useState(room.name);
  const [localError, setLocalError] = useState<string | null>(null);
  const pending = management.pendingRoomId === room.id;
  const errorMessage = localError
    ?? (management.errorRoomId === room.id ? management.errorMessage : null);
  const itemClass =
    "flex min-h-9 w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition hover:bg-[var(--app-surface-soft)] focus-visible:bg-[var(--app-accent-soft)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45";

  const close = () => {
    setOpen(false);
    setMode("actions");
    setDraft(room.name);
    setLocalError(null);
  };
  const openRename = () => {
    setDraft(room.name);
    setLocalError(null);
    setMode("rename");
  };
  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || pending) return;
    try {
      await management.onRename(room.id, name);
      close();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось переименовать комнату");
    }
  };
  const setPinned = async () => {
    if (pending) return;
    setLocalError(null);
    try {
      await management.onSetPinned(room.id, room.kind !== "pinned");
      close();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось изменить комнату");
    }
  };
  const archive = async () => {
    if (pending || room.participantCount > 0) return;
    setLocalError(null);
    try {
      await management.onArchive(room.id);
      close();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось архивировать комнату");
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : close()}
      align="end"
      side="right"
      contentRole={mode === "actions" ? "menu" : "dialog"}
      ariaLabel={`Управление комнатой ${room.name}`}
      menuClassName="w-60 rounded-[var(--app-radius-sm)] p-1"
      trigger={(
        <IconButton
          label={`Управление комнатой ${room.name}`}
          tooltipSide="right"
          disabled={pending}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--app-radius-sm)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
        >
          {pending
            ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : <EllipsisVertical className="h-4 w-4" aria-hidden="true" />}
        </IconButton>
      )}
    >
      {mode === "rename" ? (
        <form className="p-2" onSubmit={(event) => void submitRename(event)}>
          <label className="block text-xs font-medium text-[var(--app-muted)]" htmlFor={`switcher-room-name-${room.id}`}>
            Название комнаты
          </label>
          <input
            id={`switcher-room-name-${room.id}`}
            data-dropdown-autofocus
            value={draft}
            maxLength={80}
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setMode("actions");
            }}
            className="mt-1 min-h-9 w-full rounded-[var(--app-radius-sm)] border border-[var(--theme-accent)] bg-[var(--app-surface)] px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--theme-accent)_28%,transparent)]"
          />
          {errorMessage ? <p className="mt-1 text-xs text-red-400" role="alert">{errorMessage}</p> : null}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setMode("actions")} className="min-h-9 px-2 text-xs text-[var(--app-muted)]">Отмена</button>
            <button type="submit" disabled={pending || !draft.trim()} className="min-h-9 rounded-[var(--app-radius-sm)] bg-[var(--theme-accent)] px-3 text-xs font-semibold text-white disabled:opacity-45">Сохранить</button>
          </div>
        </form>
      ) : mode === "archive" ? (
        <div className="p-2">
          <p className="text-sm font-semibold">Архивировать «{room.name}»?</p>
          <p className="mt-1 text-xs leading-4 text-[var(--app-muted)]">Комната исчезнет из списка. История группы сохранится.</p>
          {room.participantCount > 0 ? <p className="mt-2 text-xs text-amber-400">Сначала все участники должны выйти.</p> : null}
          {errorMessage ? <p className="mt-2 text-xs text-red-400" role="alert">{errorMessage}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setMode("actions")} className="min-h-9 px-2 text-xs text-[var(--app-muted)]">Отмена</button>
            <button type="button" disabled={pending || room.participantCount > 0} onClick={() => void archive()} className="voople-room-actions__danger-primary min-h-9 rounded-[var(--app-radius-sm)] px-3 text-xs font-semibold disabled:opacity-45">Архивировать</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" role="menuitem" className={itemClass} onClick={openRename}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Переименовать
          </button>
          {room.canPin ? (
            <button type="button" role="menuitem" className={itemClass} onClick={() => void setPinned()}>
              {room.kind === "pinned" ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}
              {room.kind === "pinned" ? "Открепить" : "Закрепить"}
            </button>
          ) : null}
          <button type="button" role="menuitem" className={`${itemClass} voople-room-actions__danger`} onClick={() => setMode("archive")}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            Архивировать
          </button>
          {errorMessage ? <p className="px-2.5 py-2 text-xs text-red-400" role="alert">{errorMessage}</p> : null}
        </>
      )}
    </DropdownMenu>
  );
}
