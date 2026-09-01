"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRightLeft, LoaderCircle, Radio, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { GroupNowRoomCreateDraft } from "@/hooks/useGroupNowRoomCreate";

export function GroupNowRoomCreateDialog({
  open,
  canCreatePinned,
  confirmation,
  pending,
  error,
  onClose,
  onBack,
  onConfirm,
  onSubmit,
}: {
  open: boolean;
  canCreatePinned: boolean;
  confirmation: GroupNowRoomCreateDraft | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onBack: () => void;
  onConfirm: () => void;
  onSubmit: (draft: GroupNowRoomCreateDraft) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GroupNowRoomCreateDraft["kind"]>("temporary");

  useEffect(() => {
    if (!open) return;
    setName("");
    setKind("temporary");
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || pending) return;
    onSubmit({ kind, name: trimmedName });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      closeOnEscape={!pending}
      ariaLabel={confirmation ? "Подтверждение создания комнаты" : "Новая комната"}
      className="max-w-md"
    >
      {confirmation ? (
        <Confirmation
          name={confirmation.name}
          pending={pending}
          error={error}
          onBack={onBack}
          onConfirm={onConfirm}
        />
      ) : (
        <form onSubmit={submit}>
          <div className="pr-10">
            <DialogIcon icon="radio" />
            <h2 className="mt-4 text-xl font-semibold">Новая комната</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
              Комната сразу откроется с выключенным микрофоном. Остальные участники увидят её в блоке «Сейчас».
            </p>
          </div>

          <label className="mt-5 block text-sm font-medium" htmlFor="group-now-room-name">
            Название
          </label>
          <input
            id="group-now-room-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            disabled={pending}
            placeholder="Например, смотрим финал"
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 text-sm outline-none transition focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-accent)_25%,transparent)]"
          />

          <fieldset className="mt-5" disabled={pending}>
            <legend className="text-sm font-medium">Тип комнаты</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <RoomKindOption
                checked={kind === "temporary"}
                title="Временная"
                description="Исчезнет после завершения разговора"
                onChange={() => setKind("temporary")}
              />
              <RoomKindOption
                checked={kind === "pinned"}
                title="Закреплённая"
                description={canCreatePinned ? "Останется в группе" : "Только для администраторов"}
                disabled={!canCreatePinned}
                onChange={() => setKind("pinned")}
              />
            </div>
          </fieldset>

          {error ? <ErrorMessage message={error} /> : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? <Spinner /> : null}
              {pending ? "Создаём" : "Создать и зайти"}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

function RoomKindOption({
  checked,
  title,
  description,
  disabled,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 has-[:checked]:border-[var(--theme-accent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--theme-accent)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
      <input className="mt-1 accent-[var(--theme-accent)]" type="radio" name="room-kind" checked={checked} disabled={disabled} onChange={onChange} />
      <span>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {title}
          {title === "Закреплённая" ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">{description}</span>
      </span>
    </label>
  );
}

function Confirmation({
  name,
  pending,
  error,
  onBack,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="pr-10">
        <DialogIcon icon="switch" />
        <h2 className="mt-4 text-xl font-semibold">Создать «{name}» и перейти?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
          Вы уже участвуете в другом разговоре. Текущая сессия завершится только после подтверждения,
          затем Voople создаст комнату и подключит вас с выключенным микрофоном.
        </p>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={pending} onClick={onBack}>Назад</Button>
        <Button type="button" disabled={pending} onClick={onConfirm}>
          {pending ? <Spinner /> : null}
          {pending ? "Переходим" : "Завершить и создать"}
        </Button>
      </div>
    </div>
  );
}

function DialogIcon({ icon }: { icon: "radio" | "switch" }) {
  return (
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--app-surface-soft)] text-[var(--theme-accent)]">
      {icon === "radio"
        ? <Radio className="h-5 w-5" aria-hidden="true" />
        : <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />}
    </span>
  );
}

function Spinner() {
  return <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm" role="alert">
      {message}
    </p>
  );
}
