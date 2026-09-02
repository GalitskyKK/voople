"use client";

import { Check, LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";
import type { CoreRoomInviteStatus } from "@/types/room-invitations";

const STATUS_LABELS: Record<CoreRoomInviteStatus, string> = {
  pending: "Ожидает ответа",
  accepted: "Принято",
  declined: "Отклонено",
  expired: "Истекло",
  cancelled: "Отменено",
};

export function CoreRoomInvitePanel({
  sessionId,
  enabled,
}: {
  sessionId: string;
  enabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const candidates = trpc.chat.coreRoomInviteCandidates.useQuery(
    { sessionId },
    { enabled, retry: false, staleTime: 10_000 },
  );
  const refreshCandidates = () => utils.chat.coreRoomInviteCandidates.invalidate({ sessionId });
  const send = trpc.chat.coreSendRoomInvite.useMutation({ onSuccess: refreshCandidates });
  const cancel = trpc.chat.coreCancelRoomInvite.useMutation({ onSuccess: refreshCandidates });
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    if (!normalized) return candidates.data ?? [];
    return (candidates.data ?? []).filter((candidate) =>
      candidate.displayName.toLocaleLowerCase("ru-RU").includes(normalized)
      || candidate.username.toLocaleLowerCase("ru-RU").includes(normalized),
    );
  }, [candidates.data, query]);

  const invite = async (inviteeId: string) => {
    if (send.isPending || cancel.isPending) return;
    setSendingId(inviteeId);
    try {
      await send.mutateAsync({ sessionId, inviteeId });
    } catch {
      // The mutation exposes the actionable server message through send.error.
    } finally {
      setSendingId(null);
    }
  };
  const cancelInvite = async (inviteId: string) => {
    if (send.isPending || cancel.isPending) return;
    setCancellingId(inviteId);
    try {
      await cancel.mutateAsync({ inviteId });
    } catch {
      // The mutation exposes the actionable server message through cancel.error.
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div className="pr-10">
        <h3 className="text-xl font-semibold">Позвать в комнату</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
          Приглашение действует 15 минут и ведёт именно в текущую сессию.
        </p>
      </div>
      <label className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 focus-within:border-[var(--theme-accent)]">
        <Search className="h-4 w-4 text-[var(--app-muted)]" aria-hidden="true" />
        <span className="sr-only">Найти участника группы</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти участника"
          className="h-10 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--app-muted)]"
        />
      </label>

      {candidates.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--app-muted)]" aria-label="Загружаем участников">
          <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          Загружаем участников
        </div>
      ) : null}
      {candidates.error ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300" role="alert">
          <p>{candidates.error.message}</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => void candidates.refetch()}>
            Повторить
          </Button>
        </div>
      ) : null}
      {send.error || cancel.error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {send.error?.message ?? cancel.error?.message}
        </p>
      ) : null}

      {!candidates.isLoading && !candidates.error ? (
        visible.length ? (
          <ul className="voople-scroll mt-4 max-h-[min(24rem,55dvh)] space-y-2 overflow-y-auto pr-1">
            {visible.map((candidate) => {
              const inviteRecord = candidate.invite;
              const invitePending = inviteRecord?.status === "pending";
              const sending = sendingId === candidate.id;
              const cancelling = cancellingId === inviteRecord?.id;
              return (
                <li key={candidate.id} className="flex flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-2.5 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                    <ProfileAvatarVisual
                      displayName={candidate.displayName}
                      size="sm"
                      avatarImage={candidate.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{candidate.displayName}</p>
                      <p className="truncate text-xs text-[var(--app-muted)]">@{candidate.username}</p>
                      {inviteRecord ? (
                        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                          {STATUS_LABELS[inviteRecord.status]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant={invitePending ? "ghost" : "secondary"}
                      className="flex-1 sm:flex-none"
                      disabled={invitePending || send.isPending || cancel.isPending}
                      onClick={() => void invite(candidate.id)}
                    >
                      {sending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : invitePending ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      {sending ? "Отправляем" : invitePending ? "Отправлено" : inviteRecord ? "Позвать снова" : "Позвать"}
                    </Button>
                    {invitePending && inviteRecord ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="flex-1 sm:flex-none"
                        disabled={send.isPending || cancel.isPending}
                        onClick={() => void cancelInvite(inviteRecord.id)}
                      >
                        {cancelling ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <X className="h-4 w-4" />}
                        {cancelling ? "Отменяем" : "Отменить"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
            {query ? "Никого не найдено" : "Все доступные участники уже здесь"}
          </p>
        )
      ) : null}
    </div>
  );
}
