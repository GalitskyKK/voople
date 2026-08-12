"use client";

import { Button } from "@/components/ui/Button";
import { reportClientError } from "@/lib/telemetry/client";
import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">Что-то пошло не так</p>
      <p className="max-w-md text-sm text-[var(--app-muted)]">
        Техническая ошибка записана без содержимого страницы и данных аккаунта.
        {error.digest ? ` Код: ${error.digest}` : ""}
      </p>
      <Button type="button" onClick={reset} size="md">
        Повторить
      </Button>
    </div>
  );
}
