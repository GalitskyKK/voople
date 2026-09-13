"use client";

import { Link2Off, LogOut, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { roomGuestUnavailableCopy } from "@/lib/chat/room-guest-client";
import type { RoomGuestInviteUnavailableReason } from "@/types/room-guests";

const titles: Record<RoomGuestInviteUnavailableReason, string> = {
  missing: "Ссылка не работает",
  expired: "Срок ссылки истёк",
  revoked: "Приглашение отозвано",
  ended: "Разговор завершён",
  full: "Сейчас нет свободного места",
};

export function RoomGuestUnavailableState({
  reason,
  online,
  onRetry,
}: {
  reason: RoomGuestInviteUnavailableReason;
  online: boolean;
  onRetry: () => void | Promise<void>;
}) {
  const Icon = reason === "full" ? UsersRound : reason === "ended" ? LogOut : Link2Off;

  return (
    <div
      className="grid min-h-[26rem] place-content-center px-6 py-12 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-[var(--app-radius-md)] bg-[var(--app-surface-soft)] text-[var(--app-muted)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">{titles[reason]}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">
        {roomGuestUnavailableCopy(reason)}
      </p>
      {reason === "full" ? (
        <Button
          className="mx-auto mt-6"
          variant="secondary"
          disabled={!online}
          onClick={() => void onRetry()}
        >
          Проверить снова
        </Button>
      ) : null}
    </div>
  );
}
