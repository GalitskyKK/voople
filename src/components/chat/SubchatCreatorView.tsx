"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import type { ChatGroupMemberView } from "@/types/chat";
import { SubchatAccessPicker } from "./SubchatAccessPicker";

export function SubchatCreatorView({
  createSubchat,
  onCreated,
  canRestrict = false,
  loadMembers,
}: {
  createSubchat: (
    name: string,
    icon: string | null,
    accessMode: "inherit" | "restricted",
    memberIds: string[],
  ) => Promise<string>;
  onCreated: (chatId: string) => void;
  canRestrict?: boolean;
  loadMembers?: () => Promise<ChatGroupMemberView[]>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💬");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<"inherit" | "restricted">("inherit");
  const [members, setMembers] = useState<ChatGroupMemberView[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || accessMode !== "restricted" || !loadMembers || membersLoaded) return;
    let active = true;
    void loadMembers()
      .then((result) => {
        if (active) {
          setMembers(result);
          setMembersLoaded(true);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setMembersLoaded(true);
          setError(cause instanceof Error ? cause.message : "Не удалось загрузить участников");
        }
      });
    return () => {
      active = false;
    };
  }, [accessMode, loadMembers, membersLoaded, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2 || pending) return;
    setPending(true);
    setError(null);
    try {
      const chatId = await createSubchat(
        cleanName,
        icon || null,
        canRestrict ? accessMode : "inherit",
        canRestrict && accessMode === "restricted" ? selectedMemberIds : [],
      );
      setName("");
      setAccessMode("inherit");
      setSelectedMemberIds([]);
      setOpen(false);
      onCreated(chatId);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать раздел",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <IconButton
        label="Новый раздел"
        tooltipSide="bottom"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
      >
        <Plus className="h-4 w-4" />
      </IconButton>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Новый раздел"
      >
        <form onSubmit={(event) => void submit(event)}>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-xl">
            {icon || "💬"}
          </span>
          <h2 className="mt-4 text-xl font-semibold">Новый раздел</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
            Раздел использует участников и администраторов основной группы.
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
          {canRestrict ? (
            <SubchatAccessPicker
              mode={accessMode}
              members={members}
              selectedIds={selectedMemberIds}
              loading={!membersLoaded}
              onModeChange={setAccessMode}
              onToggleMember={(memberId) =>
                setSelectedMemberIds((current) =>
                  current.includes(memberId)
                    ? current.filter((id) => id !== memberId)
                    : [...current, memberId],
                )
              }
            />
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <Button
            type="submit"
            className="mt-5 w-full"
            disabled={pending || name.trim().length < 2}
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Создать раздел
          </Button>
        </form>
      </Sheet>
    </>
  );
}
