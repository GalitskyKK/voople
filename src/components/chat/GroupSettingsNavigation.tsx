import { Link2, Palette, ShieldCheck, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

export type GroupSettingsSection = "members" | "access" | "appearance" | "invites";

const SECTIONS = [
  ["members", "Люди", UsersRound],
  ["access", "Доступ", ShieldCheck],
  ["appearance", "Вид", Palette],
  ["invites", "Ссылки", Link2],
] as const;

export function GroupSettingsNavigation({
  section,
  onChange,
}: {
  section: GroupSettingsSection;
  onChange: (section: GroupSettingsSection) => void;
}) {
  return (
    <nav
      className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[var(--app-surface-soft)] p-1"
      aria-label="Настройки группы"
    >
      {SECTIONS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={section === id ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] transition",
            section === id
              ? "bg-[var(--app-surface)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
              : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </nav>
  );
}
