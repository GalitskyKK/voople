import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  ["appearance", "Оформление"],
  ["messages", "Чаты"],
  ["notifications", "Уведомления"],
  ["interface", "Интерфейс"],
  ["privacy", "Приватность и активность"],
  ["hotkeys", "Горячие клавиши"],
  ["security", "Безопасность"],
  ["legal", "Документы"],
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number][0];

export function SettingsNavigation({
  activeSection,
  onSectionChange,
}: {
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
}) {

  return (
    <nav className="settings-nav" aria-label="Разделы настроек">
      {SETTINGS_SECTIONS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-current={activeSection === id ? "location" : undefined}
          onClick={() => onSectionChange(id)}
          className={cn(activeSection === id && "settings-nav__active")}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
