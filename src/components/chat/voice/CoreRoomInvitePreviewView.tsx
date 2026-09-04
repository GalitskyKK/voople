"use client";

import { Clock3, LoaderCircle, MonitorUp, Radio, Users } from "lucide-react";
import type { ReactNode } from "react";

import { AppPageContent } from "@/components/layout/AppPageContent";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { AppInternalLink } from "@/components/ui/AppInternalLink";
import { Button } from "@/components/ui/Button";
import type { CoreRoomInvitePreviewState } from "@/lib/chat/core-room-invite-preview";

const STATE_COPY = {
  loading: ["Загружаем приглашение", "Проверяем доступ к комнате."],
  offline: ["Нет подключения", "Подключитесь к сети, чтобы проверить приглашение и войти в комнату."],
  error: ["Не удалось проверить приглашение", "Попробуйте ещё раз. До проверки вход в комнату недоступен."],
  unavailable: ["Приглашение недоступно", "Оно адресовано другому аккаунту или у вас больше нет доступа."],
} as const;

export function CoreRoomInvitePreviewView({ state, onRetry, actions }: {
  state: CoreRoomInvitePreviewState;
  onRetry: () => void;
  actions: ReactNode;
}) {
  const invite = state.kind === "ready" ? state.invite : null;
  const inviter = invite?.inviter;
  return (
    <AppPageContent className="min-h-0 overflow-y-auto pb-8">
      <section className="mx-auto mt-6 max-w-xl rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] sm:mt-10">
        <header className="flex items-center gap-3 border-b border-[var(--app-border)] p-4 sm:p-5">
          {inviter ? (
            <ProfileAvatarVisual size="sm" displayName={inviter.displayName} avatarImage={inviter.avatarUrl ? (
              // Shared host-neutral avatar; both renderers supply the same protected preview.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inviter.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : undefined} />
          ) : <Radio className="h-6 w-6 shrink-0 text-[var(--app-muted)]" aria-hidden />}
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <h1 className="font-semibold">Приглашение в комнату</h1>
            {inviter ? <p className="text-sm text-[var(--app-muted)]">{inviter.displayName} зовёт вас</p> : null}
          </div>
        </header>
        <div className="p-4 sm:p-5">
          {state.kind !== "ready" ? (
            <div role={state.kind === "error" ? "alert" : "status"}>
              <h2 className="flex items-center gap-2 font-medium">
                {state.kind === "loading" ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
                {STATE_COPY[state.kind][0]}
              </h2>
              <p className="mt-2 text-sm text-[var(--app-muted)]">{STATE_COPY[state.kind][1]}</p>
              {state.kind === "error" || state.kind === "offline" ? (
                <Button type="button" size="sm" className="mt-4" disabled={state.kind === "offline"} onClick={onRetry}>Повторить</Button>
              ) : null}
            </div>
          ) : (
            <>
              {state.invite.room ? (
                <div className="[overflow-wrap:anywhere]">
                  <p className="text-sm text-[var(--app-muted)]">{state.invite.groupName}</p>
                  <h2 className="mt-1 text-xl font-semibold">{state.invite.room.name}</h2>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--app-muted)]">
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden />{state.invite.room.participantCount} в комнате</span>
                    {state.invite.room.hasScreenShare ? <span className="flex items-center gap-1"><MonitorUp className="h-4 w-4" aria-hidden />Демонстрация</span> : null}
                    <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" aria-hidden />До <time dateTime={state.invite.expiresAt}>{new Date(state.invite.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></span>
                  </div>
                </div>
              ) : null}
              {actions}
            </>
          )}
          <AppInternalLink href="/notifications" className="mt-5 inline-block rounded text-sm text-[var(--app-muted)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">К уведомлениям</AppInternalLink>
        </div>
      </section>
    </AppPageContent>
  );
}
