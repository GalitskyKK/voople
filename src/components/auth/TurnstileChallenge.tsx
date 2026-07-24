"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileWidgetId = string;

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => TurnstileWidgetId;
  reset: (widgetId: TurnstileWidgetId) => void;
  remove: (widgetId: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileChallengeProps = {
  action: "login" | "register";
  resetKey: number;
  onTokenChange: (token: string | null) => void;
  onUnavailable: (message: string | null) => void;
};

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

export function TurnstileChallenge({
  action,
  resetKey,
  onTokenChange,
  onUnavailable,
}: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !scriptReady || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action,
      appearance: "interaction-only",
      theme: "auto",
      callback: (token) => {
        onUnavailable(null);
        onTokenChange(token);
      },
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => {
        onTokenChange(null);
        onUnavailable("Не удалось выполнить антибот-проверку. Обновите её и попробуйте снова.");
      },
    });
  }, [action, onTokenChange, onUnavailable, scriptReady]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) return;
    onTokenChange(null);
    window.turnstile.reset(widgetIdRef.current);
  }, [onTokenChange, resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className="min-h-0">
      <Script
        id="voople-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          setScriptReady(true);
          onUnavailable(null);
        }}
        onError={() => onUnavailable("Антибот-проверка не загрузилась. Проверьте соединение и обновите страницу.")}
      />
      <div ref={containerRef} className="w-full overflow-hidden rounded-xl" aria-label="Антибот-проверка" />
    </div>
  );
}
