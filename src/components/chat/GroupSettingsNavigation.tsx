import { Image, Link2, Settings2, SlidersHorizontal, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

export type GroupSettingsSection =
  | "main"
  | "people"
  | "access"
  | "appearance"
  | "advanced";

const SECTIONS = [
  ["main", "Основное", Settings2],
  ["people", "Люди", UsersRound],
  ["access", "Приглашения и доступ", Link2],
  ["appearance", "Оформление", Image],
  ["advanced", "Дополнительно", SlidersHorizontal],
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
    : SECTIONS.filter(([id]) => id === "main" || id === "people" || id === "advanced");
  return (
    <nav
      className={cn(
        "voople-scroll flex gap-1 overflow-x-auto p-1",
        layout === "sidebar" && "lg:flex-col lg:overflow-visible lg:p-0",
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
            "flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs transition",
            layout === "sidebar" && "lg:min-w-0 lg:flex-none lg:justify-start lg:text-sm",
            section === id
              ? "bg-[var(--material-interactive-fill)] text-[var(--foreground)]"
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
