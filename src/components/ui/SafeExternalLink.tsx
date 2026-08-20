"use client";

import { AlertTriangle, ExternalLink, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { openExternalUrl } from "@/lib/platform/external-links";
import { isTrustedVoopleUrl } from "@/lib/links/normalize-url";
import { trpc } from "@/lib/trpc/client";
import { reportProductEvent } from "@/lib/telemetry/client";
import { Sheet } from "./Sheet";

export function SafeExternalLink({ url, children }: { url: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [acceptedUnknown, setAcceptedUnknown] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const check = trpc.linkSafety.check.useMutation();
  const verdict = check.data;
  let sourceHost = "Некорректный адрес";
  try {
    sourceHost = new URL(url).hostname || sourceHost;
  } catch {
    // The server remains authoritative; this only keeps the warning sheet render-safe.
  }

  const beginCheck = () => {
    if (isTrustedVoopleUrl(url)) {
      void openExternalUrl(url).catch((error) => {
        setOpenError(error instanceof Error ? error.message : "Не удалось открыть ссылку");
        setOpen(true);
      });
      return;
    }
    setOpen(true);
    setAcceptedUnknown(false);
    setOpenError(null);
    check.reset();
    check.mutate({ url }, {
      onSuccess: (result) => reportProductEvent("external_link_verdict", {
        verdict: result.status,
        providerAvailable: result.provider !== "unavailable",
        insecureHttp: result.normalizedUrl.startsWith("http:"),
      }),
    });
  };

  const continueToUrl = async () => {
    if (!verdict || verdict.status === "unsafe") return;
    try {
      await openExternalUrl(verdict.normalizedUrl);
      setOpen(false);
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : "Не удалось открыть ссылку");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={beginCheck}
        className="inline break-all rounded-sm text-[var(--theme-accent)] underline decoration-[color-mix(in_srgb,var(--theme-accent)_45%,transparent)] underline-offset-2 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
      >
        {children}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} ariaLabel="Проверка внешней ссылки" className="max-w-xl">
        <header className="pr-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">Внешняя ссылка</p>
          <h2 className="mt-1 text-xl font-semibold">Проверьте адрес перед переходом</h2>
        </header>

        <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
          <p className="break-all text-sm font-medium">{verdict?.displayHost ?? sourceHost}</p>
          {verdict && verdict.asciiHost !== verdict.displayHost ? (
            <p className="mt-1 break-all text-xs text-[var(--app-muted)]">ASCII: {verdict.asciiHost}</p>
          ) : null}
          <p className="mt-2 max-h-24 overflow-y-auto break-all text-xs leading-5 text-[var(--app-muted)]">{verdict?.normalizedUrl ?? url}</p>
        </div>

        {check.isPending ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--app-muted)]" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Проверяем репутацию адреса…
          </p>
        ) : check.error ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> {check.error.message}
          </p>
        ) : verdict?.status === "unsafe" ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3" role="alert">
            <p className="flex items-center gap-2 font-semibold text-red-300"><ShieldAlert className="h-5 w-5" /> Переход заблокирован</p>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Google Web Risk отметил адрес как потенциально опасный: {verdict.threats.join(", ") || "небезопасный ресурс"}.</p>
          </div>
        ) : verdict?.status === "safe" ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm leading-6">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Адрес не найден в известных списках угроз. Проверка не гарантирует абсолютную безопасность.
          </p>
        ) : verdict ? (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm leading-6">
            <input type="checkbox" checked={acceptedUnknown} onChange={(event) => setAcceptedUnknown(event.target.checked)} className="mt-1" />
            <span>Репутационный сервис недоступен. Я проверил домен и понимаю риск перехода.</span>
          </label>
        ) : null}

        {verdict?.normalizedUrl.startsWith("http:") ? (
          <p className="mt-3 text-xs text-amber-300">Соединение HTTP не шифруется.</p>
        ) : null}
        {openError ? <p className="mt-3 text-sm text-red-300" role="alert">{openError}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium">Отмена</button>
          {verdict && verdict.status !== "unsafe" ? (
            <button
              type="button"
              onClick={() => void continueToUrl()}
              disabled={verdict.status === "unknown" && !acceptedUnknown}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--theme-accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Перейти <ExternalLink className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
