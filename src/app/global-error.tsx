"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/telemetry/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <html lang="ru">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#0d0c13",
            color: "#f7f5ff",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <section style={{ maxWidth: 480, textAlign: "center" }} role="alert">
            <p style={{ color: "#9c87ef", fontWeight: 700 }}>VOOPLE</p>
            <h1>Интерфейс временно недоступен</h1>
            <p style={{ color: "#aaa5b8", lineHeight: 1.6 }}>
              Мы записали техническую ошибку без переписки и данных аккаунта.
              Попробуйте восстановить страницу.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 12,
                border: 0,
                borderRadius: 12,
                padding: "12px 18px",
                background: "#8f7bdc",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Восстановить страницу
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
