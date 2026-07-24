"use client";

import { useState } from "react";
import { Coins, Crown, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { parseDatabaseDate } from "@/lib/format/database-date";
import { trpc } from "@/lib/trpc/client";

export function AdminUsersPage() {
  const [username, setUsername] = useState("");
  const [lookupName, setLookupName] = useState("");
  const [amount, setAmount] = useState(100);
  const [days, setDays] = useState(30);
  const [message, setMessage] = useState<string | null>(null);
  const summary = trpc.admin.userSummary.useQuery(
    { username: lookupName },
    { enabled: Boolean(lookupName), retry: false },
  );

  const currency = trpc.admin.grantCurrency.useMutation({
    onSuccess: async () => {
      setMessage(`Начислено ${amount} voops.`);
      await summary.refetch();
    },
    onError: (error) => setMessage(error.message),
  });
  const subscription = trpc.admin.grantSubscription.useMutation({
    onSuccess: async () => {
      setMessage(`Подписка продлена на ${days} дней.`);
      await summary.refetch();
    },
    onError: (error) => setMessage(error.message),
  });

  const user = summary.data;
  const busy = currency.isPending || subscription.isPending;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Управление пользователями</h2>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Все операции выполняются только через серверную admin-процедуру и записываются в историю кошелька или подписки.
        </p>
      </div>

      <form
        className="flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = username.trim().replace(/^@/, "");
          setMessage(null);
          setLookupName(next);
        }}
      >
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="username"
          maxLength={30}
          className="profile-editor-input"
        />
        <Button type="submit" disabled={!username.trim() || summary.isFetching}>
          <Search className="h-4 w-4" /> Найти
        </Button>
      </form>

      {summary.error ? <p className="text-sm text-red-300">{summary.error.message}</p> : null}
      {message ? <p className="rounded-xl border border-[var(--app-border)] px-4 py-3 text-sm">{message}</p> : null}

      {user ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="mb-4 flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-(--theme-accent)" />
              <div>
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-sm text-[var(--app-muted)]">@{user.username} · {user.wallet.balanceCoins} voops</p>
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  {user.subscription.active
                    ? `Voople+ до ${parseDatabaseDate(user.subscription.expiresAt!).toLocaleDateString("ru-RU")}`
                    : "Активной подписки нет"}
                </p>
              </div>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span>Количество voops</span>
              <input type="number" min={1} max={1_000_000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="profile-editor-input" />
            </label>
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={busy || amount < 1 || amount > 1_000_000}
              onClick={() => {
                if (!window.confirm(`Начислить ${amount} voops пользователю @${user.username}?`)) return;
                setMessage(null);
                currency.mutate({ username: user.username, amount, note: "Ручное начисление из админки" });
              }}
            >
              <Coins className="h-4 w-4" /> Начислить валюту
            </Button>
          </div>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="mb-4 flex items-start gap-3">
              <Crown className="mt-0.5 h-5 w-5 text-(--theme-accent)" />
              <div>
                <p className="font-semibold">Подписка Voople+</p>
                <p className="text-sm text-[var(--app-muted)]">Срок прибавляется к активной подписке или начинается сегодня.</p>
              </div>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span>Количество дней</span>
              <input type="number" min={1} max={365} value={days} onChange={(event) => setDays(Number(event.target.value))} className="profile-editor-input" />
            </label>
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={busy || days < 1 || days > 365}
              onClick={() => {
                if (!window.confirm(`Добавить ${days} дней Voople+ пользователю @${user.username}?`)) return;
                setMessage(null);
                subscription.mutate({ username: user.username, days });
              }}
            >
              <Crown className="h-4 w-4" /> Добавить подписку
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
