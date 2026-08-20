import {
  FileClock,
  FolderKanban,
  Gauge,
  Image,
  Link2,
  Settings2,
  ShieldCheck,
  SmilePlus,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type GroupSettingsSection =
  | "main"
  | "members"
  | "roles"
  | "sections"
  | "appearance"
  | "media"
  | "boosts"
  | "links"
  | "audit";

const SECTIONS = [
  ["main", "Основное", Settings2],
  ["members", "Участники", UsersRound],
  ["roles", "Роли и доступ", ShieldCheck],
  ["sections", "Разделы", FolderKanban],
  ["appearance", "Оформление", Image],
  ["media", "Эмодзи и звуки", SmilePlus],
  ["boosts", "Бусты", Gauge],
  ["links", "Ссылки", Link2],
  ["audit", "Журнал", FileClock],
] as const;

export function GroupSettingsNavigation({
  section,
  onChange,
  canManage,
  layout = "tabs",
  className,
}: {
  section: GroupSettingsSection;
  onChange: (section: GroupSettingsSection) => void;
  canManage: boolean;
  layout?: "tabs" | "sidebar";
  className?: string;
}) {
  const visibleSections = canManage
    ? SECTIONS
    : SECTIONS.filter(([id]) => id === "main" || id === "members" || id === "boosts");
  return (
    <nav
      className={cn(
        "voople-scroll flex gap-1 overflow-x-auto rounded-2xl bg-[var(--app-surface-soft)] p-1",
        layout === "sidebar" && "lg:flex-col lg:overflow-visible lg:bg-transparent lg:p-0",
        className,
      )}
      aria-label="Настройки группы"
    >
      {visibleSections.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={section === id ? "page" : undefined}
          className={cn(
            "flex min-w-24 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs transition",
            layout === "sidebar" && "lg:min-w-0 lg:flex-none lg:justify-start lg:text-sm",
            section === id
              ? "bg-[var(--app-surface)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
              : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </nav>
  );
}
