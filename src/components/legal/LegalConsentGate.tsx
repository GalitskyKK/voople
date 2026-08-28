"use client";

import { useState, type ReactNode } from "react";
import { FileCheck2, Loader2, LogOut, RefreshCw } from "lucide-react";

import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";

export function LegalConsentGate({
  children,
  documentBaseUrl,
  source,
  onSignOut,
}: {
  children: ReactNode;
  documentBaseUrl: string;
  source: "web_reconsent" | "desktop_reconsent";
  onSignOut: () => Promise<void>;
}) {
  const status = trpc.user.legalConsentStatus.useQuery(undefined, {
    retry: (failureCount, error) =>
      error.data?.code === "SERVICE_UNAVAILABLE" && failureCount < 2,
    retryDelay: (attempt) => Math.min(750 * 2 ** attempt, 2_000),
    refetchOnWindowFocus: false,
  });
  const accept = trpc.user.acceptLegalDocuments.useMutation();
  const [confirmed, setConfirmed] = useState(false);
  const [acceptedLocally, setAcceptedLocally] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Public routes such as /help and /feed share the main layout. Anonymous
  // visitors have no consent row to verify and must keep access to that public
  // content; protected routes are still enforced by the server proxy.
  if (status.error?.data?.code === "UNAUTHORIZED") return children;
  if (status.data?.accepted || acceptedLocally) return children;
  if (status.isPending) return <BrandedLoadingView fullscreen />;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100dvh-32px)] items-center justify-center bg-[var(--app-bg)] px-4 py-8 text-[var(--foreground)]">
      <section className="w-full max-w-xl rounded-[28px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-2xl sm:p-8" aria-labelledby="legal-consent-title">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-accent)_16%,transparent)] text-(--theme-accent)">
          <FileCheck2 className="h-6 w-6" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--theme-accent)">Документы Voople</p>
        <h1 id="legal-consent-title" className="mt-2 text-2xl font-bold sm:text-3xl">Проверьте актуальные условия</h1>

        {status.isError ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="font-medium">Не удалось проверить документы</p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">Доступ к приложению не открывается без серверной проверки. Данные аккаунта не изменены.</p>
            <Button className="mt-4" type="button" variant="secondary" onClick={() => void status.refetch()}>
              <RefreshCw className="h-4 w-4" /> Повторить
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6 text-[var(--app-muted)]">
              Мы обновили документы. Прочитайте их перед продолжением — согласие будет записано на сервере с номером версии и временем.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <a className="rounded-2xl border border-[var(--app-border)] px-4 py-3 font-medium transition-colors hover:border-(--theme-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--theme-accent)" href={`${documentBaseUrl}/legal/privacy`} target={source === "desktop_reconsent" ? "_blank" : undefined} rel="noreferrer">
                Политика конфиденциальности
                <span className="mt-1 block text-xs font-normal text-[var(--app-muted)]">Версия {status.data?.privacyVersion}</span>
              </a>
              <a className="rounded-2xl border border-[var(--app-border)] px-4 py-3 font-medium transition-colors hover:border-(--theme-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--theme-accent)" href={`${documentBaseUrl}/legal/terms`} target={source === "desktop_reconsent" ? "_blank" : undefined} rel="noreferrer">
                Условия использования
                <span className="mt-1 block text-xs font-normal text-[var(--app-muted)]">Версия {status.data?.termsVersion}</span>
              </a>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-[var(--app-elevated)] p-4 text-sm leading-5">
              <input className="mt-0.5 h-4 w-4 accent-[var(--theme-accent)]" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              <span>Я прочитал(а) и принимаю актуальные условия использования и политику конфиденциальности.</span>
            </label>
            {accept.error ? <p className="mt-3 text-sm text-red-500" role="alert">{accept.error.message}</p> : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="sm:flex-1" disabled={!confirmed || accept.isPending} onClick={() => accept.mutate({ source }, { onSuccess: () => setAcceptedLocally(true) })}>
                {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                Принять и продолжить
              </Button>
              <Button type="button" variant="ghost" disabled={signingOut} onClick={() => void signOut()}>
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Выйти
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
