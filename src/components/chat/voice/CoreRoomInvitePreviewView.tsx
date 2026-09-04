"use client";

import { Clock3, LoaderCircle, MonitorUp, Radio, ShieldCheck, Users } from "lucide-react";

import { AppPageContent } from "@/components/layout/AppPageContent";
import { RoomInviteNotificationActions } from "@/components/notifications/RoomInviteNotificationActions";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { AppInternalLink } from "@/components/ui/AppInternalLink";
import { trpc } from "@/lib/trpc/client";

function UnavailableInvite({ retry }: { retry?: () => void }) {
  return (
    <section className="mx-auto mt-8 max-w-xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-center sm:mt-12 sm:p-8">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--app-surface-soft)] text-[var(--app-muted)]">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-semibold">Приглашение недоступно</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
        Оно могло истечь, быть отменено или относиться к группе, в которой вас больше нет.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {retry ? <Button type="button" variant="secondary" onClick={retry}>Повторить</Button> : null}
        <AppInternalLink href="/notifications" className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-[var(--theme-accent)] hover:bg-[var(--app-surface-soft)]">
          К уведомлениям
        </AppInternalLink>
      </div>
    </section>
  );
}

export function CoreRoomInvitePreviewView({ inviteId }: { inviteId: string }) {
  const preview = trpc.chat.coreRoomInvitePreview.useQuery(
    { inviteId },
    { retry: false, staleTime: 5_000 },
  );

  if (preview.isLoading) {
    return (
      <AppPageContent>
        <div className="mx-auto mt-12 flex max-w-xl items-center justify-center gap-2 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-10 text-sm text-[var(--app-muted)]" aria-label="Загружаем приглашение">
          <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Загружаем приглашение
        </div>
      </AppPageContent>
    );
  }
  if (preview.error || !preview.data) {
    return (
      <AppPageContent>
        <UnavailableInvite retry={preview.error ? () => void preview.refetch() : undefined} />
      </AppPageContent>
    );
  }

  const invite = preview.data;
  const room = invite.room;
  const inviter = invite.inviter;
  return (
    <AppPageContent>
      <section className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:mt-10">
        <div className="border-b border-[var(--app-border)] bg-[linear-gradient(135deg,var(--app-accent-soft),transparent_68%)] p-5 sm:p-7">
          <div className="flex items-center gap-3">
            {inviter ? (
              <ProfileAvatarVisual
                displayName={inviter.displayName}
                size="md"
                avatarImage={inviter.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inviter.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : undefined}
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
                <Radio className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--theme-accent)]">Приглашение в комнату</p>
              <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">
                {inviter ? `${inviter.displayName} зовёт вас` : "Вас зовут в комнату"}
              </h1>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {room ? (
            <>
              <p className="text-sm text-[var(--app-muted)]">{invite.groupName ?? "Группа"}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{room.name}</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl bg-[var(--app-surface-soft)] px-3 py-2.5 text-sm">
                  <Users className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
                  {room.participantCount} в комнате
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[var(--app-surface-soft)] px-3 py-2.5 text-sm">
                  <Clock3 className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
                  Действует 15 минут
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-[var(--app-surface-soft)] px-3 py-2.5 text-sm">
                  <MonitorUp className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
                  {room.hasScreenShare ? "Идёт демонстрация" : "Без демонстрации"}
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-6 border-t border-[var(--app-border)] pt-5">
            <RoomInviteNotificationActions invite={invite} />
          </div>
          <AppInternalLink href="/notifications" className="mt-5 inline-flex text-sm font-medium text-[var(--app-muted)] hover:text-[var(--foreground)]">
            Все уведомления
          </AppInternalLink>
        </div>
      </section>
    </AppPageContent>
  );
}
