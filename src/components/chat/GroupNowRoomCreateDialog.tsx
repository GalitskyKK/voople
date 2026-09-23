"use client";

import { FormEvent, useState } from "react";
import { ArrowRightLeft, LoaderCircle, Radio } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { GroupNowRoomCreateDraft } from "@/hooks/useGroupNowRoomCreate";

type GroupNowRoomCreateDialogProps = {
  open: boolean;
  confirmation: GroupNowRoomCreateDraft | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
  onSubmit: (draft: GroupNowRoomCreateDraft) => void;
};

export function GroupNowRoomCreateDialog(props: GroupNowRoomCreateDialogProps) { return props.open ? <RoomCreateSession {...props} /> : null; }

function RoomCreateSession({ open, confirmation, pending, error, onClose, onBack, onConfirm, onSubmit }: GroupNowRoomCreateDialogProps) {
  const [name, setName] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const trimmedName = name.trim(); if (!trimmedName || pending) return; onSubmit({ name: trimmedName }); };

  return (
    <Sheet open={open} onClose={onClose} closeOnEscape={!pending} ariaLabel={confirmation ? "Подтверждение создания комнаты" : "Новая комната"} className="voople-room-create-dialog max-w-md">
      {confirmation ? <Confirmation name={confirmation.name} pending={pending} error={error} onBack={onBack} onConfirm={onConfirm} /> : (
        <form onSubmit={submit}>
          <div className="pr-10"><DialogIcon icon="radio" /><h2 className="mt-4 text-xl font-semibold">Новая комната</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Постоянное пространство с названием: останется в группе и будет доступно после разговора.</p></div>
          <label className="mt-5 block text-sm font-medium" htmlFor="group-now-room-name">Название</label>
          <input id="group-now-room-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required disabled={pending} placeholder="Например, смотрим финал" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--app-border)] bg-black/10 px-3 text-sm outline-none transition focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)]" />
          {error ? <ErrorMessage message={error} /> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Отмена</Button><Button type="submit" disabled={pending || !name.trim()}>{pending ? <Spinner /> : null}{pending ? "Создаём" : "Создать и зайти"}</Button></div>
        </form>
      )}
    </Sheet>
  );
}

function Confirmation({ name, pending, error, onBack, onConfirm }: { name: string; pending: boolean; error: string | null; onBack: () => void; onConfirm: () => void; }) { const split = name === "Сплит"; return <div><div className="pr-10"><DialogIcon icon="switch" /><h2 className="mt-4 text-xl font-semibold">{split ? "Перейти в новый Сплит?" : `Создать «${name}» и перейти?`}</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Вы уже участвуете в другом разговоре. Он завершится для вас только после подтверждения, затем Voople {split ? "откроет быстрый отдельный разговор" : "создаст постоянную комнату"} с выключенным микрофоном.</p></div>{error ? <ErrorMessage message={error} /> : null}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" disabled={pending} onClick={onBack}>Отмена</Button><Button type="button" disabled={pending} onClick={onConfirm}>{pending ? <Spinner /> : null}{pending ? "Переходим" : split ? "Начать Сплит" : "Завершить и создать"}</Button></div></div>; }
function DialogIcon({ icon }: { icon: "radio" | "switch" }) { return <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">{icon === "radio" ? <Radio className="h-5 w-5" aria-hidden="true" /> : <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />}</span>; }
function Spinner() { return <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />; }
function ErrorMessage({ message }: { message: string }) { return <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-200" role="alert">{message}</p>; }
