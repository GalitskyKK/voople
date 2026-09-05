"use client";

import { Link2, LoaderCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { CoreRoomInviteCandidateRow } from "./CoreRoomInviteCandidateRow";
import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { useVisibleClock } from "@/hooks/useVisibleClock";
import { Button } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import { trpc } from "@/lib/trpc/client";

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
  const online = useBrowserOnline();
  const now = useVisibleClock(enabled && online);
  const candidates = trpc.chat.coreRoomInviteCandidates.useQuery(
    { sessionId },
    { enabled, retry: false, staleTime: 0, refetchInterval: enabled ? 10_000 : false, refetchIntervalInBackground: false, refetchOnWindowFocus: true, refetchOnReconnect: true },
  );
  const refreshCandidates = () => utils.chat.coreRoomInviteCandidates.invalidate({ sessionId });
  const send = trpc.chat.coreSendRoomInvite.useMutation({ onSuccess: refreshCandidates });
  const cancel = trpc.chat.coreCancelRoomInvite.useMutation({ onSuccess: refreshCandidates });
  const createGuest = trpc.chat.coreCreateRoomGuestInvite.useMutation();
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    if (!normalized) return candidates.data ?? [];
    return (candidates.data ?? []).filter((candidate) =>
      candidate.displayName.toLocaleLowerCase("ru-RU").includes(normalized)
      || candidate.username.toLocaleLowerCase("ru-RU").includes(normalized),
    );
  }, [candidates.data, query]);

  const invite = async (inviteeId: string) => {
    if (!enabled || !online || send.isPending || cancel.isPending) return;
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
    if (!enabled || !online || send.isPending || cancel.isPending) return;
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
      <div className="mt-5 border-y border-[var(--app-border)] py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Позвать без аккаунта</p>
            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
              Гость попадёт только в эту комнату и не станет участником группы.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!enabled || !online || createGuest.isPending}
            onClick={() => createGuest.mutate({ sessionId })}
          >
            {createGuest.isPending
              ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : <Link2 className="h-4 w-4" aria-hidden="true" />}
            Создать ссылку
          </Button>
        </div>
        {createGuest.data ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <ShareButton
              url={createGuest.data.shareUrl}
              mode="copy"
              label="Скопировать"
              title="Войти в комнату Voople"
            />
            <ShareButton
              url={createGuest.data.shareUrl}
              label="Поделиться"
              title="Войти в комнату Voople"
            />
            <span className="self-center text-xs text-[var(--app-muted)]">Действует 15 минут</span>
          </div>
        ) : null}
        {createGuest.error ? (
          <p className="mt-3 text-sm text-red-400" role="alert">{createGuest.error.message}</p>
        ) : null}
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

      {!online ? <p role="status" className="mt-4 text-sm text-[var(--app-muted)]">Нет подключения. Приглашения обновятся после восстановления сети.</p> : null}
      {online && candidates.isLoading ? (
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

      {enabled && online && candidates.fetchStatus !== "paused" && !candidates.isLoading && !candidates.error ? (
        visible.length ? (
          <ul className="voople-scroll mt-4 max-h-[min(24rem,55dvh)] space-y-2 overflow-y-auto pr-1">
            {visible.map((candidate) => (
              <CoreRoomInviteCandidateRow
                key={candidate.id}
                candidate={candidate}
                now={now}
                activity={sendingId === candidate.id ? "sending" : cancellingId === candidate.invite?.id ? "cancelling" : send.isPending || cancel.isPending ? "busy" : "idle"}
                onInvite={() => void invite(candidate.id)}
                onCancel={(inviteId) => void cancelInvite(inviteId)}
              />
            ))}
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
