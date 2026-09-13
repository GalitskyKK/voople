"use client";

import { ChevronDown, LoaderCircle, Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import type { ChatGroupMemberView } from "@/types/chat";
import { SubchatAccessPicker } from "./SubchatAccessPicker";

export function SubchatCreatorView({
  open,
  onOpenChange,
  createSubchat,
  onCreated,
  canRestrict = false,
  loadMembers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💬");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<"inherit" | "restricted">("inherit");
  const [members, setMembers] = useState<ChatGroupMemberView[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (!open || !showOptions || accessMode !== "restricted" || !loadMembers || membersLoaded) return;
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
  }, [accessMode, loadMembers, membersLoaded, open, showOptions]);

  const reset = () => {
    setName("");
    setIcon("💬");
    setAccessMode("inherit");
    setSelectedMemberIds([]);
    setShowOptions(false);
    setError(null);
  };

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
      reset();
      onOpenChange(false);
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

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Новый раздел"
        onClick={() => onOpenChange(true)}
        className="flex min-h-10 w-full items-center gap-2 rounded-[var(--app-radius-sm)] px-2.5 text-left text-sm font-medium text-[var(--theme-accent)] transition-colors hover:bg-[var(--app-surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-accent)]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Создать раздел
      </button>
    );
  }

  return (
    <form
      aria-label="Новый раздел"
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        reset();
        onOpenChange(false);
      }}
      className="rounded-[var(--app-radius-sm)] bg-[var(--app-surface-soft)] p-2"
    >
      <div className="flex items-center gap-1.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--background)] text-base" aria-hidden="true">
          {icon || "💬"}
        </span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Название раздела</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 50))}
            className="h-9 w-full rounded-[var(--app-radius-sm)] border border-[var(--app-border)] bg-[var(--background)] px-2.5 text-sm outline-none focus:border-[var(--theme-accent)]"
            placeholder="Название раздела"
            minLength={2}
            maxLength={50}
            required
          />
        </label>
        <Button
          type="submit"
          size="sm"
          aria-label={pending ? "Создаём раздел" : "Создать раздел"}
          className="h-9 shrink-0 px-3"
          disabled={pending || name.trim().length < 2}
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Создать"}
        </Button>
        <button
          type="button"
          aria-label="Отменить создание раздела"
          onClick={() => {
            reset();
            onOpenChange(false);
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--app-radius-sm)] text-[var(--app-muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        aria-expanded={showOptions}
        onClick={() => setShowOptions((current) => !current)}
        className="mt-1.5 flex min-h-8 items-center gap-1.5 rounded-[var(--app-radius-sm)] px-2 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--theme-accent)]"
      >
        Иконка{canRestrict ? " и доступ" : ""}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {showOptions ? (
        <div className="border-t border-[var(--app-border)] pt-2">
          <fieldset>
            <legend className="sr-only">Иконка</legend>
            <div className="flex flex-wrap gap-1.5">
              {["💬", "🎮", "🎵", "🎨", "💡", "📌", "🔥", "🛠️"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIcon(value)}
                  className={`grid h-9 w-9 place-items-center rounded-[var(--app-radius-sm)] border text-base transition ${
                    icon === value
                      ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]"
                      : "border-[var(--app-border)] bg-[var(--background)] hover:bg-[var(--app-surface)]"
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
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs leading-4 text-red-400" role="alert">{error}</p> : null}
    </form>
  );
}
