"use client";

import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { VoopleMark } from "@/components/brand/VoopleMark";
import { Button } from "@/components/ui/Button";
import type { AuthSessionBootstrapReason } from "@/lib/supabase/session-bootstrap";

export function SessionBootstrapRecoveryView({
  reason,
  pending,
  onRetry,
  withinDesktopFrame = false,
}: {
  reason: AuthSessionBootstrapReason;
  pending: boolean;
  onRetry: () => void;
  withinDesktopFrame?: boolean;
}) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const offline = !online;
  const title = offline ? "Нет соединения" : "Не удалось проверить сессию";
  const description = offline
    ? "Проверьте интернет, VPN или DNS. Сессия сохранена — Voople продолжит после восстановления сети."
    : reason === "timeout"
      ? "Сервер не ответил вовремя. Сессия сохранена, можно безопасно повторить проверку."
      : "Соединение с аккаунтом временно недоступно. Данные сессии не удалены.";

  return (
    <main
      className={`flex ${withinDesktopFrame ? "min-h-[calc(100dvh-32px)]" : "min-h-dvh"} items-center justify-center bg-[var(--app-bg)] px-4 py-8 text-[var(--foreground)]`}
    >
      <section
        className="w-full max-w-md rounded-[28px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-2xl sm:p-8"
        aria-labelledby="session-recovery-title"
        role="alert"
      >
        <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-accent)_16%,transparent)] text-(--theme-accent)">
          {offline ? (
            <WifiOff className="h-6 w-6" aria-hidden="true" />
          ) : (
            <VoopleMark className="h-8 w-8" />
          )}
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--theme-accent)">
          Сессия Voople
        </p>
        <h1 id="session-recovery-title" className="mt-2 text-2xl font-bold">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
          {description}
        </p>
        <Button
          className="mt-6"
          type="button"
          variant="secondary"
          disabled={pending || offline}
          onClick={onRetry}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {pending ? "Проверяем" : offline ? "Ждём сеть" : "Повторить"}
        </Button>
      </section>
    </main>
  );
}
