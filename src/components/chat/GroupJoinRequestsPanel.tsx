"use client";

import { Check, Loader2, UserCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import type { GroupJoinRequestView } from "@/types/chat";
import { RelativeTime } from "@/components/ui/RelativeTime";

export function GroupJoinRequestsPanel({ load, resolve }: {
  load: () => Promise<GroupJoinRequestView[]>;
  resolve: (requestId: string, approve: boolean) => Promise<unknown>;
}) {
  const [items, setItems] = useState<GroupJoinRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    load()
      .then((nextItems) => { if (active) setItems(nextItems); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить заявки");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const decide = async (requestId: string, approve: boolean) => {
    if (pendingId) return;
    setPendingId(requestId);
    setError(null);
    try {
      await resolve(requestId, approve);
      setItems((current) => current.filter((item) => item.id !== requestId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обработать заявку");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] p-4" aria-labelledby="join-requests-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="join-requests-title" className="flex items-center gap-2 text-sm font-semibold"><UserCheck className="h-4 w-4 text-[var(--theme-accent)]" />Заявки на вступление</h3>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Одобрение добавит участника в группу.</p>
        </div>
        {items.length ? <span className="rounded-full bg-[var(--app-accent-soft)] px-2 py-1 text-xs font-medium text-[var(--theme-accent)]">{items.length}</span> : null}
      </div>
      {loading ? <div className="mt-4 flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-[var(--app-muted)]" /></div> : null}
      {!loading && !items.length ? <p className="mt-4 rounded-xl bg-[var(--app-surface-soft)] px-3 py-4 text-center text-sm text-[var(--app-muted)]">Новых заявок нет</p> : null}
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] p-3">
            <ProfileAvatar displayName={item.displayName} animatedAvatarUrl={item.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.displayName}</p><p className="truncate text-xs text-[var(--app-muted)]">@{item.username} · <RelativeTime iso={item.createdAt} /></p></div>
            <Button type="button" size="sm" className="w-8 px-0" variant="secondary" aria-label={`Отклонить заявку ${item.displayName}`} disabled={Boolean(pendingId)} onClick={() => void decide(item.id, false)}><X className="h-4 w-4" /></Button>
            <Button type="button" size="sm" className="w-8 px-0" aria-label={`Одобрить заявку ${item.displayName}`} disabled={Boolean(pendingId)} onClick={() => void decide(item.id, true)}>{pendingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
