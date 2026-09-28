"use client";

import Link from "next/link";
import { Check, LoaderCircle, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { RoomGuestConversionResult } from "@/types/room-guests";

type ConversionPhase = "converting" | "signed_out" | "success" | "error";

const linkButtonClass = "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--app-radius-md)] px-5 text-sm font-medium transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]";

function successCopy(result: RoomGuestConversionResult) {
  if (result.status === "joined" || result.status === "already_joined") {
    return {
      title: `Вы теперь в группе «${result.groupName}»`,
      detail: "Гостевое место связано с аккаунтом. Теперь доступны история, сообщения и следующие комнаты группы.",
      action: "Открыть группу",
      href: `/messages/${result.groupId}`,
    };
  }
  if (result.status === "requested") {
    return {
      title: "Заявка отправлена",
      detail: `Аккаунт сохранён. Администратор группы «${result.groupName}» должен подтвердить постоянное участие.`,
      action: "Перейти в Voople",
      href: "/feed",
    };
  }
  return {
    title: "Аккаунт связан с гостевым местом",
    detail: `Чтобы войти в закрытую группу «${result.groupName}», попросите администратора прислать приглашение.`,
    action: "Перейти в Voople",
    href: "/feed",
  };
}

export function RoomGuestConversionPanel({
  phase,
  result,
  error,
  registrationHref,
  loginHref,
  onRetry,
}: {
  phase: ConversionPhase;
  result: RoomGuestConversionResult | null;
  error: string | null;
  registrationHref: string;
  loginHref: string;
  onRetry: () => void;
}) {
  if (phase === "converting") {
    return (
      <div className="grid min-h-[30rem] place-content-center px-6 py-12 text-center" role="status" aria-live="polite">
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[var(--theme-accent)] motion-reduce:animate-none" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold">Сохраняем участие</h1>
        <p className="mt-2 text-sm text-[var(--app-muted)]">Связываем гостевое место с вашим аккаунтом.</p>
      </div>
    );
  }

  if (phase === "signed_out") {
    return (
      <div className="grid min-h-[30rem] place-content-center px-6 py-12 text-center">
        <UserPlus className="mx-auto h-8 w-8 text-[var(--theme-accent)]" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold">Сохраните своё место</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">
          Создайте аккаунт или войдите. После этого Voople вернёт вас сюда и завершит переход без повторной гостевой ссылки.
        </p>
        <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={registrationHref} className={`${linkButtonClass} border border-[var(--material-border-hover)] bg-[var(--material-control-fill)] text-[var(--foreground)]`}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Создать аккаунт
          </Link>
          <Link href={loginHref} className={`${linkButtonClass} border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--foreground)]`}>
            <LogIn className="h-4 w-4" aria-hidden="true" /> Войти
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "success" && result) {
    const copy = successCopy(result);
    return (
      <div className="grid min-h-[30rem] place-content-center px-6 py-12 text-center" role="status" aria-live="polite">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--material-ice-soft)] text-[var(--material-ice)]">
          <Check className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">{copy.detail}</p>
        <Link href={copy.href} className={`${linkButtonClass} mx-auto mt-6 border border-[var(--material-border-hover)] bg-[var(--material-control-fill)] text-[var(--foreground)]`}>
          {copy.action}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid min-h-[30rem] place-content-center px-6 py-12 text-center" role="alert">
      <h1 className="text-2xl font-semibold">Не удалось сохранить участие</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">{error}</p>
      <Button className="mx-auto mt-6" variant="secondary" onClick={onRetry}>Повторить</Button>
    </div>
  );
}
