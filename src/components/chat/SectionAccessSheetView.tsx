"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { ChatGroupMemberView } from "@/types/chat";

import { SubchatAccessPicker } from "./SubchatAccessPicker";

type SectionAccess = {
  accessMode: "inherit" | "restricted";
  selectedMemberIds: string[];
};

export function SectionAccessSheetView({
  loadAccess,
  loadMembers,
  saveAccess,
  onChanged,
}: {
  loadAccess: () => Promise<SectionAccess>;
  loadMembers: () => Promise<ChatGroupMemberView[]>;
  saveAccess: (
    accessMode: SectionAccess["accessMode"],
    memberIds: string[],
  ) => Promise<unknown>;
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SectionAccess["accessMode"]>("inherit");
  const [members, setMembers] = useState<ChatGroupMemberView[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.all([loadAccess(), loadMembers()])
      .then(([access, loadedMembers]) => {
        if (!active) return;
        setMode(access.accessMode);
        setSelectedIds(access.selectedMemberIds);
        setMembers(loadedMembers);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Не удалось загрузить настройки раздела",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAccess, loadMembers, open]);

  const save = async () => {
    if (pending || loading) return;
    setPending(true);
    setError(null);
    try {
      await saveAccess(mode, mode === "restricted" ? selectedIds : []);
      setOpen(false);
      onChanged?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось сохранить настройки раздела",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoading(true);
          setError(null);
          setOpen(true);
        }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
        aria-label="Настроить доступ к разделу"
        title="Доступ к разделу"
      >
        <ShieldCheck className="h-4 w-4" />
      </button>
      <Sheet
        open={open}
        onClose={() => !pending && setOpen(false)}
        ariaLabel="Доступ к разделу"
      >
        <h2 className="text-xl font-semibold">Доступ к разделу</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
          Раздел может быть доступен всей группе или только выбранным участникам.
        </p>
        <SubchatAccessPicker
          mode={mode}
          members={members}
          selectedIds={selectedIds}
          loading={loading}
          onModeChange={setMode}
          onToggleMember={(memberId) =>
            setSelectedIds((current) =>
              current.includes(memberId)
                ? current.filter((id) => id !== memberId)
                : [...current, memberId],
            )
          }
        />
        {error ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-5 w-full"
          disabled={loading || pending}
          onClick={() => void save()}
        >
          {loading || pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : null}
          Сохранить доступ
        </Button>
      </Sheet>
    </>
  );
}
