"use client";

import { useState, type ReactNode } from "react";
import { KeyRound, Keyboard, RotateCcw, Scale, ShieldCheck, SlidersHorizontal, UserRound, Settings2 } from "lucide-react";

import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { Button } from "@/components/ui/Button";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { ChatAppearanceSettings } from "@/components/settings/ChatAppearanceSettings";
import { HotkeySettings, type HotkeyRuntimeStatus } from "@/components/settings/HotkeySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PersonalVoiceSettings } from "@/components/settings/PersonalVoiceSettings";
import {
  SettingsNavigation,
  type SettingsSectionId,
} from "@/components/settings/SettingsNavigation";
import { APP_THEMES, type AppThemeId } from "@/lib/app-themes";
import { LEGAL_PAGES } from "@/lib/constants/legal";

export type SettingsDestinationRenderer = (props: {
  href: string;
  className: string;
  children: ReactNode;
  external?: boolean;
}) => ReactNode;

export function AppSettingsView({
  renderDestination,
  hotkeyRuntimeStatus,
  desktopWindowSettings,
  desktopCallNotifications = false,
  desktopNotificationSettings,
  accountSecuritySettings,
  accountDataSettings,
  socialSettings,
  subscriptionActive,
}: {
  renderDestination: SettingsDestinationRenderer;
  hotkeyRuntimeStatus?: HotkeyRuntimeStatus;
  desktopWindowSettings?: ReactNode;
  desktopCallNotifications?: boolean;
  desktopNotificationSettings?: ReactNode;
  accountSecuritySettings?: ReactNode;
  accountDataSettings?: ReactNode;
  socialSettings?: ReactNode;
  subscriptionActive?: boolean;
}) {
  const { preferences, updatePreferences, resetPreferences } = useAppPreferences();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("account");
  const showsDevicePreferences = ["appearance", "advanced"].includes(activeSection);
  const unlockedThemeIds: AppThemeId[] = subscriptionActive
    ? APP_THEMES.filter((theme) => theme.paid).map((theme) => theme.id)
    : [];

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-5 py-4 lg:py-6">
      <SectionPageHeader
        title="Настройки"
        sticky
        variant="plain"
        density="compact"
        action={
          showsDevicePreferences ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetPreferences}
              aria-label="Сбросить настройки этого устройства"
              title="Сбросить настройки этого устройства"
            >
              <RotateCcw className="h-4 w-4" /> Сбросить
            </Button>
          ) : undefined
        }
      />

      <div className="settings-layout">
        <SettingsNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="min-w-0 space-y-5">

      {activeSection === "account" ? <div className="space-y-4">
        <div className="settings-section__header"><Settings2 className="h-5 w-5" /><div><h2>Аккаунт</h2><p>Данные и управление аккаунтом.</p></div></div>
        {accountDataSettings}
      </div> : null}

      {activeSection === "profile" ? <section className="settings-section">
        <div className="settings-section__header"><UserRound className="h-5 w-5" /><div><h2>Профиль</h2><p>Имя, @username, аватар и оформление находятся в редакторе профиля.</p></div></div>
        {renderDestination({ href: "/me", className: "inline-flex min-h-10 items-center rounded-[var(--material-control-radius)] border border-[var(--material-border)] bg-[var(--material-control-fill)] px-4 text-sm font-medium hover:bg-[var(--material-interactive-fill)]", children: "Открыть профиль" })}
      </section> : null}

      {activeSection === "appearance" ? (
        <><AppearanceSettings
          unlockedThemeIds={unlockedThemeIds}
          subscriptionAction={subscriptionActive === false ? renderDestination({
            href: "/shop?tab=plus",
            className: "settings-subscription-link",
            children: "Открыть набор тем Вупл+",
          }) : undefined}
        /><ChatAppearanceSettings hasSubscription={Boolean(subscriptionActive)} /></>
      ) : null}

      {activeSection === "notifications" ? <NotificationSettings
        showDesktopCallNotifications={desktopCallNotifications}
        desktopControls={desktopNotificationSettings}
      /> : null}

      {activeSection === "voice" ? <PersonalVoiceSettings /> : null}

      {activeSection === "advanced" ? <>
      <section id="interface" className="settings-section">
        <div className="settings-section__header">
          <SlidersHorizontal className="h-5 w-5" />
          <div>
            <h2>Интерфейс</h2>
            <p>Настройки сохраняются только на этом устройстве.</p>
          </div>
        </div>
        <div className="settings-rows">
          <div className="settings-row">
            <div><p className="font-medium">Плотность интерфейса</p><p>Уменьшает внутренние отступы панелей и списков.</p></div>
            <div className="settings-segmented">
              <button type="button" aria-pressed={preferences.density === "comfortable"} onClick={() => updatePreferences({ density: "comfortable" })}>Обычно</button>
              <button type="button" aria-pressed={preferences.density === "compact"} onClick={() => updatePreferences({ density: "compact" })}>Компактно</button>
            </div>
          </div>
          <label className="settings-row">
            <div><p className="font-medium">Уменьшить движение</p><p>Отключает декоративные переходы и анимации.</p></div>
            <input type="checkbox" className="settings-switch" checked={preferences.reduceMotion} onChange={(event) => updatePreferences({ reduceMotion: event.target.checked })} />
          </label>
          <label className="settings-row">
            <div><p className="font-medium">Показывать индикаторы онлайна</p><p>Отображает статус присутствия других пользователей возле аватаров только на этом устройстве.</p></div>
            <input type="checkbox" className="settings-switch" checked={preferences.showPresence} onChange={(event) => updatePreferences({ showPresence: event.target.checked })} />
          </label>
        </div>
      </section>

      {desktopWindowSettings}
      </> : null}

      {activeSection === "privacy" ? socialSettings : null}

      {activeSection === "advanced" ? <section id="hotkeys" className="settings-section">
        <div className="settings-section__header">
          <Keyboard className="h-5 w-5" />
          <div>
            <h2>Горячие клавиши</h2>
            <p>Нажмите на сочетание, затем задайте новое. Изменения сохраняются на этом устройстве.</p>
          </div>
        </div>
        <HotkeySettings
          hotkeys={preferences.hotkeys}
          onChange={(hotkeys) => updatePreferences({ hotkeys })}
          runtimeStatus={hotkeyRuntimeStatus}
        />
      </section> : null}

      {activeSection === "security" ? <div id="security" className="space-y-4">
        <div className="settings-section__header">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <h2>Безопасность</h2>
            <p>Вход без пароля уменьшает риск повторного использования паролей.</p>
          </div>
        </div>
        {accountSecuritySettings ?? <div className="settings-security-card">
          <KeyRound className="h-5 w-5 text-(--theme-accent)" />
          <div>
            <p className="font-medium">Код подтверждения по email</p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">Вупл. отправляет одноразовый шестизначный код. Никому его не сообщайте.</p>
          </div>
        </div>}
      </div> : null}

      {activeSection === "advanced" ? <section id="legal" className="settings-section">
        <div className="settings-section__header">
          <Scale className="h-5 w-5" />
          <div>
            <h2>Документы и информация</h2>
            <p>Условия использования, способы оплаты, доставка цифровых товаров и контакты.</p>
          </div>
        </div>
        <nav className="settings-legal-links" aria-label="Юридическая информация">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm">
            {LEGAL_PAGES.map(({ href, label }) => (
              <li key={href}>
                {renderDestination({
                  href,
                  external: true,
                  className: "transition-colors hover:text-[var(--foreground)] hover:underline hover:underline-offset-2",
                  children: label,
                })}
              </li>
            ))}
          </ul>
        </nav>
      </section> : null}
        </div>
      </div>
    </div>
  );
}
