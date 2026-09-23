"use client";

import { GitFork } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { GroupNowUser } from "@/types/group-now";

export function GroupNowSplitPicker({
  candidates,
  pending,
  onClose,
  onChoose,
}: {
  candidates: GroupNowUser[] | null;
  pending: boolean;
  onClose: () => void;
  onChoose: (user: GroupNowUser) => void;
}) {
  return (
    <Sheet open={candidates !== null} onClose={onClose} ariaLabel="Выбрать участника для Сплита" className="max-w-md">
      <div className="flex items-center gap-3">
        <GitFork className="h-5 w-5 text-[var(--theme-accent)]" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Сплит</h2>
      </div>
      <p className="mt-2 text-sm text-[var(--app-muted)]">Выберите человека из текущего разговора. Вы оба останетесь на месте до его согласия.</p>
      <div className="mt-5 flex flex-col gap-2">
        {candidates?.map((user) => (
          <Button key={user.id} type="button" variant="secondary" disabled={pending} onClick={() => onChoose(user)}>
            {user.displayName || user.username}
          </Button>
        ))}
      </div>
      <div className="mt-6 flex justify-end"><Button type="button" variant="ghost" onClick={onClose}>Отмена</Button></div>
    </Sheet>
  );
}
