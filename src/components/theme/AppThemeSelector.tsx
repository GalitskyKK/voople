"use client";

import { Check, Lock } from "lucide-react";

import { APP_THEMES, type AppThemeId } from "@/lib/app-themes";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { VooplePlusFeatureSurface } from "@/components/subscription/VooplePlusFeatureSurface";
import { useAppTheme } from "./AppThemeProvider";

type AppThemeSelectorProps = {
  unlockedThemeIds?: AppThemeId[];
  /** Сохранять выбор в БД (для авторизованных). */
  persistToAccount?: boolean;
  premiumAction?: React.ReactNode;
};

export function AppThemeSelector({
  unlockedThemeIds = [],
  persistToAccount = true,
  premiumAction,
}: AppThemeSelectorProps) {
  const { themeId, setThemeId, setAccountThemeId } = useAppTheme();
  const unlocked = new Set<AppThemeId>(unlockedThemeIds);
  const utils = trpc.useUtils();
  const account = trpc.customization.accountTheme.useQuery(undefined, { retry: false, enabled: persistToAccount });
  const updateTheme = trpc.customization.update.useMutation({
    onSuccess: (equipped) => {
      setAccountThemeId(equipped.effectiveAppThemeId);
      void utils.customization.accountTheme.invalidate();
      void utils.customization.getEquipped.invalidate();
    },
  });

  const handleSelect = (nextThemeId: AppThemeId) => {
    if (persistToAccount) {
      // Render only after server confirmation: failure leaves the previous theme intact.
      updateTheme.mutate({ appThemeId: nextThemeId });
    } else setThemeId(nextThemeId);
  };

  return (
    <div className="settings-theme-picker">
      {persistToAccount && account.isPending ? <p role="status" className="text-xs text-[var(--app-muted)]">Загружаем доступ к темам…</p> : null}
      {account.isError ? <p role="alert" className="text-xs text-[var(--app-muted)]">
        Не удалось загрузить доступ к темам. <button type="button" onClick={() => { void account.refetch(); }} className="underline">Повторить</button>
      </p> : null}
      {([false, true] as const).map((paid) => {
        const options = (
          <div className={cn("settings-theme-picker__options", paid && "settings-theme-picker__options--colors")}>
            {APP_THEMES.filter((theme) => Boolean(theme.paid) === paid).map((theme) => {
              const active = theme.id === themeId;
              const available = !theme.paid || unlocked.has(theme.id);
              return (
                <ThemeOptionButton
                  key={theme.id}
                  theme={theme}
                  active={active}
                  available={available}
                  busy={updateTheme.isPending}
                  onSelect={() => handleSelect(theme.id)}
                />
              );
            })}
          </div>
        );

        if (paid) {
          return (
            <VooplePlusFeatureSurface
              key="paid"
              title="Цветовые темы"
              description="Единый цвет приложения, сообщений и профиля на всех устройствах."
              locked={unlockedThemeIds.length === 0}
              action={premiumAction}
            >
              {options}
            </VooplePlusFeatureSurface>
          );
        }

        return <section key="free" className="settings-theme-picker__group">
          <div className="settings-theme-picker__heading">
            <h3>Базовые темы</h3>
            <span>Для всех</span>
          </div>
          {options}
        </section>;
      })}
      {updateTheme.error ? <p className="text-xs text-red-300">{updateTheme.error.message}</p> : null}
    </div>
  );
}

type ThemeOptionButtonProps = {
  theme: (typeof APP_THEMES)[number];
  active: boolean;
  available: boolean;
  busy: boolean;
  onSelect: () => void;
};

function ThemeOptionButton({
  theme,
  active,
  available,
  busy,
  onSelect,
}: ThemeOptionButtonProps) {
  return (
    <button
      type="button"
      disabled={!available || busy}
      onClick={onSelect}
      className={cn("settings-theme-option", active && "settings-theme-option--active")}
      aria-pressed={active}
      aria-label={`${theme.name}. ${theme.description}${available ? "" : ". Доступно с Вупл+"}`}
      title={theme.description}
    >
      <span
        className="settings-theme-option__preview"
        style={{
          background: `linear-gradient(135deg, ${theme.tokens.background} 0 48%, ${theme.tokens.surface} 49% 72%, ${theme.tokens.accent} 73%)`,
        }}
        aria-hidden
      >
        {active ? <Check className="h-4 w-4" /> : null}
        {!available ? <Lock className="h-4 w-4" /> : null}
      </span>
      <span className="settings-theme-option__name">{theme.name}</span>
    </button>
  );
}
