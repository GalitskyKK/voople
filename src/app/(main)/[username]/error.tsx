"use client";

import { Button } from "@/components/ui/Button";
import { reportClientError } from "@/lib/telemetry/client";
import { useEffect } from "react";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">Не удалось загрузить профиль</p>
      <Button type="button" onClick={reset} variant="ghost">
        Повторить
      </Button>
    </div>
  );
}
