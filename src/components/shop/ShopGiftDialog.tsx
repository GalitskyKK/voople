"use client";

import { Gift, Search, Send } from "lucide-react";
import { useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useDebouncedSearchQuery } from "@/hooks/useDebouncedSearchQuery";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { ShopItemView } from "@/types/shop";
import type { UserSearchHit } from "@/types/search";

import { ShopCatalogPreview } from "./ShopCatalogPreview";

export function ShopGiftDialog({
  item,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  item: ShopItemView | null;
  pending: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (recipientId: string, message: string) => void;
}) {
  const { query, setQuery, debouncedQuery } = useDebouncedSearchQuery();
  const [recipient, setRecipient] = useState<UserSearchHit | null>(null);
  const [message, setMessage] = useState("");
  const search = trpc.search.explore.useQuery(
    { q: debouncedQuery },
    { enabled: Boolean(item) && debouncedQuery.length >= 1, staleTime: 10_000 },
  );

  const close = () => {
    if (pending) return;
    setRecipient(null);
    setMessage("");
    setQuery("");
    onClose();
  };

  return (
    <Sheet open={Boolean(item)} onClose={close} className="max-w-2xl" ariaLabel="Отправить подарок">
      {item ? (
        <div className="grid gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)]">
              <ShopCatalogPreview catalog={item.previewMeta} previewUrl={item.previewUrl} />
            </div>
            <p className="mt-3 text-sm font-semibold">{item.name}</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">{item.priceRub} ₽ · получатель получит предмет навсегда</p>
          </div>

          <div className="min-w-0 pr-8 sm:pr-0">
            <div className="flex items-center gap-2 text-[var(--theme-accent)]"><Gift className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.12em]">Подарок</span></div>
            <h2 className="mt-2 text-xl font-semibold">Кому отправить?</h2>
            {recipient ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--theme-accent)] bg-[var(--app-accent-soft)] p-3">
                <ProfileAvatar displayName={recipient.displayName} size="sm" animatedAvatarUrl={recipient.avatarUrl} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{recipient.displayName}</span><span className="block truncate text-xs text-[var(--app-muted)]">@{recipient.username}</span></span>
                <button type="button" onClick={() => setRecipient(null)} className="rounded-lg px-2 py-1 text-xs text-[var(--app-muted)] hover:bg-[var(--app-surface)]">Изменить</button>
              </div>
            ) : (
              <>
                <label className="relative mt-4 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" /><span className="sr-only">Найти получателя</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="voople-input w-full pl-10" placeholder="Имя или @username" /></label>
                <div className="voople-scroll mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {search.isFetching ? <div className="h-16 animate-pulse rounded-xl bg-[var(--app-surface-soft)]" /> : search.data?.users.map((user) => (
                    <button key={user.id} type="button" onClick={() => setRecipient(user)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--app-surface-soft)]">
                      <ProfileAvatar displayName={user.displayName} size="sm" animatedAvatarUrl={user.avatarUrl} />
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{user.displayName}</span><span className="block truncate text-xs text-[var(--app-muted)]">@{user.username}</span></span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="mt-4 block text-xs font-medium">Сообщение — необязательно<textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 280))} className="voople-input mt-1 min-h-20 w-full resize-none" placeholder="Несколько тёплых слов" /></label>
            {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
            <Button type="button" className={cn("mt-4 w-full", !recipient && "opacity-60")} disabled={!recipient || pending} onClick={() => recipient && onConfirm(recipient.id, message)}><Send className="h-4 w-4" />{pending ? "Готовим оплату…" : `Подарить за ${item.priceRub} ₽`}</Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
