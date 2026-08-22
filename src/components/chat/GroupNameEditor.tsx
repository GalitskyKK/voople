"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function GroupNameEditor({
  value,
  canManage,
  save,
  onChanged,
}: {
  value: string;
  canManage: boolean;
  save: (name: string) => Promise<{ name: string }>;
  onChanged: (name: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = draft.trim();
  const changed = clean !== value;

  const submit = async () => {
    if (!canManage || pending || !changed || clean.length < 2) return;
    setPending(true);
    setError(null);
    try {
      const result = await save(clean);
      setDraft(result.name);
      onChanged(result.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить название");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <label className="text-sm font-semibold" htmlFor="group-name-input">Название группы</label>
      <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">Отображается в чатах, приглашениях и карточках сообщества.</p>
      <div className="mt-3 flex gap-2">
        <input
          id="group-name-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 50))}
          disabled={!canManage || pending}
          minLength={2}
          maxLength={50}
          className="voople-input min-w-0 flex-1"
        />
        <Button type="button" onClick={() => void submit()} disabled={!changed || clean.length < 2 || pending || !canManage}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Сохранить</span>
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
