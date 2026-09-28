import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  ["account", "Аккаунт"],
  ["profile", "Профиль"],
  ["privacy", "Приватность"],
  ["notifications", "Уведомления"],
  ["voice", "Голос и видео"],
  ["appearance", "Внешний вид"],
  ["security", "Безопасность"],
  ["advanced", "Дополнительно"],
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
