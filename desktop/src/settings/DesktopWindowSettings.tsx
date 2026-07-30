import { AppWindow } from "lucide-react";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";

export function DesktopWindowSettings() {
  const { preferences, updatePreferences } = useAppPreferences();

  return (
    <section id="desktop-window" className="settings-section scroll-mt-28">
      <div className="settings-section__header">
        <AppWindow className="h-5 w-5" />
        <div>
          <h2>Окно приложения</h2>
          <p>Управляет тем, когда Voople остаётся работать в фоне.</p>
        </div>
      </div>
      <div className="settings-rows">
        <label className="settings-row">
          <div>
            <p className="font-medium">Закрывать в область уведомлений</p>
            <p>
              Кнопка закрытия скрывает окно. Звонки и глобальные горячие
              клавиши продолжают работать.
            </p>
          </div>
          <input
            type="checkbox"
            className="settings-switch"
            checked={preferences.closeToTray}
            onChange={(event) =>
              updatePreferences({ closeToTray: event.target.checked })
            }
          />
        </label>
        <label className="settings-row">
          <div>
            <p className="font-medium">Сворачивать в область уведомлений</p>
            <p>
              При сворачивании окно исчезает с панели задач. Открыть его можно
              через значок Voople или глобальную горячую клавишу.
            </p>
          </div>
          <input
            type="checkbox"
            className="settings-switch"
            checked={preferences.minimizeToTray}
            onChange={(event) =>
              updatePreferences({ minimizeToTray: event.target.checked })
            }
          />
        </label>
      </div>
      {preferences.closeToTray ? (
        <p className="text-xs leading-5 text-[var(--app-muted)]">
          Для полного выхода используйте пункт «Выйти» в меню значка Voople.
        </p>
      ) : null}
    </section>
  );
}
