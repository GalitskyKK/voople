"use client";

import { ArrowRightLeft, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { GroupNowRoom } from "@/types/group-now";

export function GroupNowRoomSwitchDialog({
  room,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  room: GroupNowRoom | null;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet
      open={Boolean(room)}
      onClose={onCancel}
      closeOnEscape={!pending}
      ariaLabel="Подтверждение перехода в другую комнату"
      className="max-w-md"
    >
      <div className="pr-10">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">
          <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">Перейти в {room?.name}?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
          Вы уже участвуете в другом разговоре. Voople сначала завершит текущую сессию,
          а затем подключит вас к выбранной комнате с выключенным микрофоном.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          Остаться
        </Button>
        <Button type="button" disabled={pending} onClick={onConfirm}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {pending ? "Переходим" : "Завершить и перейти"}
        </Button>
      </div>
    </Sheet>
  );
}
