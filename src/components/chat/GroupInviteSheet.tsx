"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { trpc } from "@/lib/trpc/client";

export function GroupInviteSheet({ chatId }: { chatId: string }) {
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createInvite = trpc.chat.createInvite.useMutation({
    onSuccess: ({ token }) => {
      setInviteUrl(`${window.location.origin}/invite/${token}`);
      setCopied(false);
    },
  });
  const revokeInvite = trpc.chat.revokeInvite.useMutation({
    onSuccess: () => {
      setInviteUrl(null);
      setCopied(false);
    },
  });

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
        aria-label="Пригласить в группу"
      >
        <UserPlus className="h-4 w-4" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} className="max-w-md">
        <div className="pr-10">
          <span className="mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-(--theme-accent)">
            <Link2 className="h-5 w-5" />
          </span>
          <h2 className="text-xl font-semibold">Приглашение в беседу</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Ссылка действует 7 дней и допускает до 20 вступлений. Получивший её увидит
            название группы до входа.
          </p>
        </div>

        {inviteUrl ? (
          <div className="mt-5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
            <p className="break-all text-sm">{inviteUrl}</p>
            <Button type="button" className="mt-3 w-full" onClick={copyInvite}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Скопировано" : "Скопировать ссылку"}
            </Button>
            <button
              type="button"
              disabled={revokeInvite.isPending}
              onClick={() => {
                const token = inviteUrl.split("/").at(-1);
                if (token) revokeInvite.mutate({ chatId, token });
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              {revokeInvite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Отозвать ссылку
            </button>
          </div>
        ) : (
          <Button
            type="button"
            className="mt-5 w-full"
            disabled={createInvite.isPending}
            onClick={() => createInvite.mutate({ chatId })}
          >
            {createInvite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Создать ссылку
          </Button>
        )}

        {createInvite.error || revokeInvite.error ? (
          <p className="mt-3 text-sm text-red-400">
            {createInvite.error?.message ?? revokeInvite.error?.message}
          </p>
        ) : null}
      </Sheet>
    </>
  );
}
