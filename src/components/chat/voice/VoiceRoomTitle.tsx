"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil, X } from "lucide-react";

import { IconButton } from "@/components/ui/IconButton";
import type { VoiceRoomRenameModel } from "./voice-room-sheet-models";

export function VoiceRoomTitle({
  title,
  durationLabel,
  rename,
}: {
  title: string;
  durationLabel: string | null;
  rename: VoiceRoomRenameModel | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rename?.name ?? title);
  const [localError, setLocalError] = useState<string | null>(null);
  const errorMessage = localError ?? rename?.errorMessage ?? null;

  const cancel = () => {
    setEditing(false);
    setDraft(rename?.name ?? title);
    setLocalError(null);
  };
  const beginEdit = () => {
    if (!rename) return;
    setDraft(rename.name);
    setLocalError(null);
    setEditing(true);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.trim();
    if (!rename || rename.pending || !name) return;
    if (name === rename.name) {
      cancel();
      return;
    }
    setLocalError(null);
    try {
      await rename.onSubmit(name);
      setEditing(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не удалось переименовать комнату");
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        {editing && rename ? (
          <form className="flex min-w-0 items-center gap-1" onSubmit={(event) => void submit(event)}>
            <label className="sr-only" htmlFor={`room-name-${rename.roomId}`}>
              Название комнаты
            </label>
            <input
              id={`room-name-${rename.roomId}`}
              autoFocus
              value={draft}
              maxLength={80}
              disabled={rename.pending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                cancel();
              }}
              className="min-h-8 min-w-0 max-w-64 rounded-[var(--app-radius-sm)] border border-[var(--theme-accent)] bg-[var(--app-surface)] px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--theme-accent)_28%,transparent)] sm:text-base"
            />
            <IconButton
              label="Сохранить название комнаты"
              type="submit"
              disabled={rename.pending || !draft.trim()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--app-radius-sm)] text-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Отменить переименование"
              type="button"
              disabled={rename.pending}
              onClick={cancel}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--app-radius-sm)] text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </form>
        ) : (
          rename ? (
            <button
              type="button"
              aria-label={`Переименовать комнату ${rename.name}`}
              onClick={beginEdit}
              className="group/title flex min-w-0 items-center gap-2 rounded-[var(--app-radius-sm)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
            >
              <h2 className="voople-full-room__title truncate text-base font-semibold sm:text-lg">
                {rename.name}
              </h2>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)] opacity-0 transition group-hover/title:opacity-100 group-focus-visible/title:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
            </button>
          ) : (
            <h2 className="voople-full-room__title truncate text-base font-semibold sm:text-lg">
              {title}
            </h2>
          )
        )}
        {durationLabel ? (
          <span className="shrink-0 text-xs tabular-nums text-[var(--app-muted)]">
            {durationLabel}
          </span>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="mt-1 truncate text-xs text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
