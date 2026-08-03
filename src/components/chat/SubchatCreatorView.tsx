"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

export function SubchatCreatorView({
  createSubchat,
  onCreated,
}: {
  createSubchat: (name: string, icon: string | null) => Promise<string>;
  onCreated: (chatId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💬");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2 || pending) return;
    setPending(true);
    setError(null);
    try {
      const chatId = await createSubchat(cleanName, icon || null);
      setName("");
      setOpen(false);
      onCreated(chatId);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать тему",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
        aria-label="Создать тему"
        title="Создать тему"
      >
        <Plus className="h-4 w-4" />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Новая тема"
      >
        <form onSubmit={(event) => void submit(event)}>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-xl">
            {icon || "💬"}
          </span>
          <h2 className="mt-4 text-xl font-semibold">Новая тема</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Тема использует участников и администраторов основной группы.
          </p>
          <label className="mt-5 block text-sm font-medium">
            Название
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 50))}
              className="voople-input mt-2 w-full"
              placeholder="Например, Игровая комната"
              minLength={2}
              maxLength={50}
              required
            />
          </label>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Иконка</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {["💬", "🎮", "🎵", "🎨", "💡", "📌", "🔥", "🛠️"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIcon(value)}
                  className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition ${
                    icon === value
                      ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]"
                      : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]"
                  }`}
                  aria-label={`Иконка ${value}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <Button
            type="submit"
            className="mt-5 w-full"
            disabled={pending || name.trim().length < 2}
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Создать тему
          </Button>
        </form>
      </Sheet>
    </>
  );
}
