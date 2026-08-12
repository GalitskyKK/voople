"use client";

import { useState } from "react";
import { Download, Loader2, MailCheck, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";

function DataExportControl({ exportAccountData }: { exportAccountData: () => Promise<void> }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runExport = async () => {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      await exportAccountData();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Не удалось скачать данные");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="settings-security-card">
      <Download className="h-5 w-5 text-(--theme-accent)" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Экспорт данных аккаунта</p>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          JSON-файл с профилем, публикациями, вашими сообщениями, покупками и историей согласий. Пароли, токены и чужие сообщения не включаются.
        </p>
        <Button type="button" size="sm" variant="secondary" className="mt-3" disabled={exporting} onClick={() => void runExport()}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Скачать данные
        </Button>
        {error ? <p className="mt-2 text-sm text-red-500" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}

function PendingVerification({ emailHint }: { emailHint: string | null }) {
  const utils = trpc.useUtils();
  const [code, setCode] = useState("");
  const verify = trpc.user.verifyAccountDeletion.useMutation({
    onSuccess: async () => {
      setCode("");
      await utils.user.accountDeletionStatus.invalidate();
    },
  });
  const resend = trpc.user.resendAccountDeletionVerification.useMutation({
    onSettled: async () => utils.user.accountDeletionStatus.invalidate(),
  });

  return (
    <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-3">
      <p className="flex items-center gap-2 text-sm font-medium"><MailCheck className="h-4 w-4" />Код отправлен на {emailHint ?? "подтверждённую почту"}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">Введите шесть цифр из письма. Код действует 15 минут.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          aria-label="Код подтверждения удаления"
          className="min-w-36 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 font-mono tracking-[0.3em] outline-none focus:border-(--theme-accent)"
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <Button type="button" size="sm" disabled={code.length !== 6 || verify.isPending} onClick={() => verify.mutate({ code })}>
          {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Подтвердить
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={resend.isPending} onClick={() => resend.mutate()}>
          {resend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Новый код
        </Button>
      </div>
      {verify.error ? <p className="mt-2 text-sm text-red-500" role="alert">{verify.error.message}</p> : null}
      {resend.error ? <p className="mt-2 text-sm text-red-500" role="alert">{resend.error.message}</p> : null}
    </div>
  );
}

function AccountDeletionControl() {
  const utils = trpc.useUtils();
  const me = trpc.user.me.useQuery();
  const deletion = trpc.user.accountDeletionStatus.useQuery();
  const [confirmation, setConfirmation] = useState("");
  const request = trpc.user.requestAccountDeletion.useMutation({
    onSuccess: () => setConfirmation(""),
    onSettled: async () => utils.user.accountDeletionStatus.invalidate(),
  });
  const cancel = trpc.user.cancelAccountDeletion.useMutation({
    onSuccess: async () => utils.user.accountDeletionStatus.invalidate(),
  });
  const active = deletion.data?.status === "pending_verification" || deletion.data?.status === "verified" || deletion.data?.status === "processing"
    ? deletion.data
    : null;
  const usernameMatches = Boolean(me.data) && confirmation.trim().toLocaleLowerCase("ru") === me.data?.username.toLocaleLowerCase("ru");

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Удаление аккаунта</p>
          {active ? (
            <>
              <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">
                {active.status === "processing"
                  ? "Удаление уже выполняется. На этом этапе отменить его нельзя."
                  : `Самая ранняя дата удаления — ${new Date(active.executeAfter).toLocaleDateString("ru-RU")}. До неё заявку можно отменить.`}
              </p>
              {active.status === "pending_verification" ? <PendingVerification emailHint={active.emailHint} /> : null}
              {active.status !== "processing" ? (
                <Button type="button" size="sm" variant="secondary" className="mt-3" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                  {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Отменить заявку
                </Button>
              ) : null}
              {cancel.error ? <p className="mt-2 text-sm text-red-500" role="alert">{cancel.error.message}</p> : null}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">Сначала скачайте экспорт. Мы отправим код на подтверждённую почту, а удаление начнётся не раньше чем через 7 дней.</p>
              <label className="mt-4 block text-sm">
                <span className="font-medium">Введите username @{me.data?.username ?? "…"}</span>
                <input className="mt-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-2 outline-none focus:border-(--theme-accent)" value={confirmation} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
              </label>
              <Button type="button" size="sm" variant="secondary" className="mt-3 text-red-500" disabled={!usernameMatches || request.isPending} onClick={() => request.mutate({ username: confirmation.trim() })}>
                {request.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                Отправить код
              </Button>
              {request.error ? <p className="mt-2 text-sm text-red-500" role="alert">{request.error.message}</p> : null}
            </>
          )}
        </div>
      </div>
      {deletion.error ? <p className="mt-3 text-sm text-red-500" role="alert">Не удалось проверить статус заявки: {deletion.error.message}</p> : null}
    </div>
  );
}

export function AccountDataControls({ exportAccountData }: { exportAccountData: () => Promise<void> }) {
  return (
    <div className="space-y-4 border-t border-[var(--app-border)] pt-5">
      <DataExportControl exportAccountData={exportAccountData} />
      <AccountDeletionControl />
    </div>
  );
}
