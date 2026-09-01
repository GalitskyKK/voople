"use client";

import { Check, LoaderCircle, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatarVisual";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";

export function CoreRoomInvitePanel({
  sessionId,
  enabled,
}: {
  sessionId: string;
  enabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sentIds, setSentIds] = useState<ReadonlySet<string>>(() => new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const candidates = trpc.chat.coreRoomInviteCandidates.useQuery(
    { sessionId },
    { enabled, retry: false, staleTime: 10_000 },
  );
  const send = trpc.chat.coreSendRoomInvite.useMutation();
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    if (!normalized) return candidates.data ?? [];
    return (candidates.data ?? []).filter((candidate) =>
      candidate.displayName.toLocaleLowerCase("ru-RU").includes(normalized)
      || candidate.username.toLocaleLowerCase("ru-RU").includes(normalized),
    );
  }, [candidates.data, query]);

  const invite = async (inviteeId: string) => {
    if (send.isPending || sentIds.has(inviteeId)) return;
    setSendingId(inviteeId);
    try {
      await send.mutateAsync({ sessionId, inviteeId });
      setSentIds((current) => new Set(current).add(inviteeId));
    } catch {
      // The mutation exposes the actionable server message through send.error.
    } finally {
      setSendingId(null);
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
      {send.error ? <p className="mt-3 text-sm text-red-400" role="alert">{send.error.message}</p> : null}

      {!candidates.isLoading && !candidates.error ? (
        visible.length ? (
          <ul className="voople-scroll mt-4 max-h-[min(24rem,55dvh)] space-y-2 overflow-y-auto pr-1">
            {visible.map((candidate) => {
              const sent = sentIds.has(candidate.id);
              const pending = sendingId === candidate.id;
              return (
                <li key={candidate.id} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-2.5">
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
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={sent ? "ghost" : "secondary"}
                    disabled={sent || send.isPending}
                    onClick={() => void invite(candidate.id)}
                  >
                    {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : sent ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {sent ? "Отправлено" : "Позвать"}
                  </Button>
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
