"use client";

import { Check, Copy, Link2, Loader2, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

type GroupInviteSheetViewProps = {
  inviteBaseUrl?: string;
  createInvite: () => Promise<{ token: string }>;
  revokeInvite: (token: string) => Promise<unknown>;
};

export function GroupInviteSheetView({
  inviteBaseUrl,
  createInvite,
  revokeInvite,
}: GroupInviteSheetViewProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedBaseUrl =
    inviteBaseUrl ??
    (typeof window === "undefined" ? "" : window.location.origin);
  const inviteUrl = token
    ? `${resolvedBaseUrl.replace(/\/+$/, "")}/invite/${token}`
    : null;

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createInvite();
      setToken(result.token);
      setCopied(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать ссылку",
      );
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
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
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Не удалось отозвать ссылку",
      );
    } finally {
      setRevoking(false);
    }
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

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        className="max-w-md"
        ariaLabel="Приглашение в беседу"
      >
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
            <Button type="button" className="mt-3 w-full" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Скопировано" : "Скопировать ссылку"}
            </Button>
            <button
              type="button"
              disabled={revoking}
              onClick={() => void revoke()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Отозвать ссылку
            </button>
          </div>
        ) : (
          <Button
            type="button"
            className="mt-5 w-full"
            disabled={creating}
            onClick={() => void create()}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Создать ссылку
          </Button>
        )}

        {error ? <p className="mt-3 text-sm text-red-400" role="alert">{error}</p> : null}
      </Sheet>
    </>
  );
}
