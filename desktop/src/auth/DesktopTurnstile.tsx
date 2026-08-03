import { useEffect, useRef } from "react";

type DesktopTurnstileApi = {
  remove: (widgetId: string) => void;
  render: (
    container: HTMLElement,
    options: {
      action: string;
      appearance: "interaction-only";
      callback: (token: string) => void;
      "error-callback": (code?: string) => void;
      "expired-callback": () => void;
      sitekey: string;
      theme: "dark";
    },
  ) => string;
};

type DesktopWindow = Window & { turnstile?: DesktopTurnstileApi };

function getTurnstile() {
  return (window as DesktopWindow).turnstile;
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (getTurnstile()) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.append(script);
  });
  return scriptPromise;
}

export function DesktopTurnstile({
  action = "login",
  onError,
  onTokenChange,
  resetKey,
  siteKey,
}: {
  action?: "login" | "register";
  onError: (message: string | null) => void;
  onTokenChange: (token: string | null) => void;
  resetKey: number;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let widgetId: string | null = null;

    void loadTurnstile()
      .then(() => {
        const turnstile = getTurnstile();
        if (!active || !containerRef.current || !turnstile) return;
        widgetId = turnstile.render(containerRef.current, {
          action,
          appearance: "interaction-only",
          sitekey: siteKey,
          theme: "dark",
          callback: (token) => {
            onError(null);
            onTokenChange(token);
          },
          "expired-callback": () => onTokenChange(null),
          "error-callback": (code) => {
            onTokenChange(null);
            onError(
              code === "110200"
                ? "Домен desktop-приложения не разрешён в настройках Turnstile."
                : "Антибот-проверка недоступна. Проверьте соединение.",
            );
          },
        });
      })
      .catch(() => {
        if (active) onError("Не удалось загрузить антибот-проверку.");
      });

    return () => {
      active = false;
      const turnstile = getTurnstile();
      if (widgetId && turnstile) turnstile.remove(widgetId);
      onTokenChange(null);
    };
  }, [action, onError, onTokenChange, resetKey, siteKey]);

  return <div ref={containerRef} className="turnstile-container" aria-label="Антибот-проверка" />;
}
