"use client";

import { History, Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { ChatGroupAuditEntryView } from "@/types/chat";

function describeEntry(entry: ChatGroupAuditEntryView) {
  const actor = entry.actor?.displayName ?? "Удалённый пользователь";
  const target = entry.target?.displayName ?? "участника";
  switch (entry.action) {
    case "member_added": return `${actor} добавил(а) ${target}`;
    case "member_removed": return `${actor} исключил(а) ${target}`;
    case "member_left": return `${actor} покинул(а) группу`;
    case "role_changed":
      return entry.details.toRole === "admin"
        ? `${actor} назначил(а) ${target} администратором`
        : `${actor} снял(а) с ${target} роль администратора`;
    case "ownership_transferred":
      return `${actor} передал(а) владение группой пользователю ${target}`;
    case "topics_changed":
      return `${actor} ${entry.details.enabled ? "включил(а)" : "выключил(а)"} разделы`;
    case "visibility_changed":
      return `${actor} сделал(а) группу ${entry.details.visibility === "public" ? "открытой" : "закрытой"}`;
    case "group_name_changed":
      return `${actor} переименовал(а) группу в «${String(entry.details.name ?? "Без названия")}»`;
  }
}

export function GroupAuditLog({ load }: { load: () => Promise<ChatGroupAuditEntryView[]> }) {
  const [entries, setEntries] = useState<ChatGroupAuditEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load()
      .then((nextEntries) => {
        if (!active) return;
        setError(null);
        setEntries(nextEntries);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить журнал действий");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const retry = async () => {
    setLoading(true);
    try {
      const nextEntries = await load();
      setError(null);
      setEntries(nextEntries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить журнал действий");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="mt-4 flex h-28 items-center justify-center text-[var(--app-muted)]"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-400">
        <p role="alert">{error}</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void retry()}>
          <RotateCw className="h-4 w-4" /> Повторить
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--app-border)] p-5 text-center text-sm text-[var(--app-muted)]">
        <History className="mx-auto mb-2 h-5 w-5" />
        Новых административных действий пока нет.
      </div>
    );
  }

  const formatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });
  return (
    <ol className="voople-scroll mt-4 max-h-96 space-y-1 overflow-y-auto" aria-label="Журнал действий группы">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-xl px-3 py-2.5 hover:bg-[var(--app-surface-soft)]">
          <p className="text-sm leading-5">{describeEntry(entry)}</p>
          <time className="mt-1 block text-xs text-[var(--app-muted)]" dateTime={entry.createdAt}>
            {formatter.format(new Date(entry.createdAt))}
          </time>
        </li>
      ))}
    </ol>
  );
}
