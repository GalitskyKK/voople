"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, UserPlus, UsersRound, X } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type SelectedUser = { id: string; username: string; displayName: string };

export function GroupChatCreator() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<SelectedUser[]>([]);
  const me = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const search = trpc.user.search.useQuery({ q: debounced }, { enabled: open && debounced.length > 0, staleTime: 10_000 });
  const create = trpc.chat.createGroup.useMutation({
    onSuccess: (chatId) => {
      void utils.chat.list.invalidate();
      setOpen(false);
      setName("");
      setQuery("");
      setSelected([]);
      router.push(`/messages/${chatId}`);
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const toggleUser = (user: SelectedUser) => {
    setSelected((current) => current.some((item) => item.id === user.id)
      ? current.filter((item) => item.id !== user.id)
      : current.length < 19 ? [...current, user] : current);
  };

  const canCreate = name.trim().length >= 2 && selected.length >= 2 && !create.isPending;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-2 text-sm font-medium transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-accent-soft)]">
        <UserPlus className="h-4 w-4 text-(--theme-accent)" /> Новая группа
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} className="max-w-xl">
        <div className="pr-10">
          <h2 className="text-xl font-semibold">Новая группа</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Название и минимум два собеседника. Добавить можно до 19 человек.</p>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} placeholder="Например, Ночной эфир" className="voople-input mt-1.5 w-full" />
        </label>

        {selected.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.map((user) => <button key={user.id} type="button" onClick={() => toggleUser(user)} className="inline-flex items-center gap-1 rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-xs text-(--theme-accent)">@{user.username}<X className="h-3 w-3" /></button>)}
          </div>
        ) : null}

        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти человека" className="voople-input w-full pl-9" />
        </label>

        <div className="voople-scroll mt-2 max-h-64 space-y-1 overflow-y-auto">
          {search.isFetching ? <div className="h-16 animate-pulse rounded-xl bg-[var(--app-surface-soft)]" /> : null}
          {search.data?.filter((user) => user.id !== me.data?.id).map((user) => {
            const active = selected.some((item) => item.id === user.id);
            return (
              <button key={user.id} type="button" onClick={() => toggleUser(user)} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition", active ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]" : "border-transparent hover:bg-[var(--app-surface-soft)]")}>
                <ProfileAvatar displayName={user.displayName} size="sm" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.displayName}</span><span className="block truncate text-xs text-[var(--app-muted)]">@{user.username}</span></span>
                {active ? <Check className="h-4 w-4 text-(--theme-accent)" /> : null}
              </button>
            );
          })}
          {debounced && !search.isFetching && search.data?.length === 0 ? <p className="py-4 text-center text-sm text-[var(--app-muted)]">Никого не нашли</p> : null}
        </div>

        {create.error ? <p className="mt-3 text-xs text-red-400">{create.error.message}</p> : null}
        <Button type="button" className="mt-4 w-full" disabled={!canCreate} onClick={() => create.mutate({ name: name.trim(), memberIds: selected.map((user) => user.id) })}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />} Создать группу
        </Button>
      </Sheet>
    </>
  );
}
