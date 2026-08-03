"use client";

import { Check, Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

export function GroupInviteLinkPanel({
  inviteBaseUrl,
  createInvite,
  revokeInvite,
}: {
  inviteBaseUrl?: string;
  createInvite: () => Promise<{ token: string }>;
  revokeInvite: (token: string) => Promise<unknown>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseUrl =
    inviteBaseUrl ??
    (typeof window === "undefined" ? "" : window.location.origin);
  const inviteUrl = token
    ? `${baseUrl.replace(/\/+$/, "")}/invite/${token}`
    : null;

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createInvite();
      setToken(result.token);
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать ссылку");
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  };

  const revoke = async () => {
    if (!token || revoking) return;
    setRevoking(true);
    setError(null);
    try {
      await revokeInvite(token);
      setToken(null);
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отозвать ссылку");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--app-accent-soft)] text-(--theme-accent)">
          <Link2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Пригласить по ссылке</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
            Для людей без взаимной подписки: участник сам подтверждает вход.
          </p>
        </div>
      </div>

      {inviteUrl ? (
        <div className="mt-3">
          <p className="break-all rounded-xl bg-[var(--app-surface)] px-3 py-2 text-xs">
            {inviteUrl}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Готово" : "Копировать"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={revoking}
              onClick={() => void revoke()}
            >
              {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Отозвать
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full"
          disabled={creating}
          onClick={() => void create()}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Создать ссылку
        </Button>
      )}

      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
