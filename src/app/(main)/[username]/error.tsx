"use client";

import { Button } from "@/components/ui/Button";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-[color-mix(in_srgb,var(--foreground)_72%,transparent)]">Не удалось загрузить профиль</p>
      <Button type="button" onClick={reset} variant="ghost">
        Повторить
      </Button>
    </div>
  );
}
