"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, MessageCircleMore, Palette, RotateCcw, Scale, ShieldCheck, SlidersHorizontal, Sparkles, Type } from "lucide-react";

import { LegalLinks } from "@/components/layout/LegalLinks";
import { Button } from "@/components/ui/Button";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { AppThemeSelector } from "@/components/theme/AppThemeSelector";
import { APP_THEMES, type AppThemeId } from "@/lib/app-themes";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const FONT_OPTIONS = [
  { id: "small", label: "Компактный", sample: "Aa" },
  { id: "standard", label: "Стандартный", sample: "Aa" },
  { id: "large", label: "Крупный", sample: "Aa" },
] as const;

export function AppSettingsPage() {
  const { preferences, updatePreferences, resetPreferences } = useAppPreferences();
  const subscription = trpc.shop.subscriptionStatus.useQuery(undefined, { retry: false });
  const unlockedThemeIds: AppThemeId[] = subscription.data?.active
    ? APP_THEMES.filter((theme) => theme.paid).map((theme) => theme.id)
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 py-4 lg:py-6">
      <header className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Настройки</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Интерфейс, доступность и безопасность аккаунта.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={resetPreferences}>
          <RotateCcw className="h-4 w-4" /> Сбросить
        </Button>
      </header>

      <section id="team-pin" className="settings-section scroll-mt-6">
        <div className="settings-section__header">
          <Sparkles className="h-5 w-5" />
          <div>
            <h2>События и награды</h2>
            <p>Испытания, сезонные активности и уникальные награды собраны в отдельном центре.</p>
          </div>
        </div>
        <Link href="/events" className="settings-subscription-link inline-flex items-center gap-1.5">
          Открыть события <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <MessageCircleMore className="h-5 w-5" />
          <div>
            <h2>Сообщения</h2>
            <p>Выберите спокойный фон диалогов. Цветной фон входит в Voople+.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            { id: "plain", label: "Без фона", preview: "var(--app-surface)" },
            { id: "doodles", label: "Контуры", preview: "radial-gradient(circle at 20% 25%, color-mix(in srgb,var(--theme-accent) 22%,transparent) 0 2px,transparent 3px),var(--app-surface-soft)" },
            { id: "grid", label: "Сетка", preview: "linear-gradient(color-mix(in srgb,var(--foreground) 8%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--foreground) 8%,transparent) 1px,transparent 1px),var(--app-surface-soft)" },
            { id: "aurora", label: "Аврора · Plus", preview: "radial-gradient(circle at 20% 20%,#7457c880,transparent 45%),radial-gradient(circle at 80% 80%,#36b7a466,transparent 45%),#11131b", paid: true },
          ] as const).map((wallpaper) => {
            const locked = Boolean("paid" in wallpaper && wallpaper.paid && !subscription.data?.active);
            return <button key={wallpaper.id} type="button" disabled={locked} aria-pressed={preferences.chatWallpaper === wallpaper.id} onClick={() => updatePreferences({ chatWallpaper: wallpaper.id })} className={cn("settings-choice min-h-24 overflow-hidden p-2", preferences.chatWallpaper === wallpaper.id && "settings-choice--active", locked && "opacity-55")}>
              <span className="block h-12 w-full rounded-lg border border-[var(--app-border)]" style={{ background: wallpaper.preview, backgroundSize: wallpaper.id === "grid" ? "10px 10px" : undefined }} />
              <span className="mt-1.5 text-xs">{wallpaper.label}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <Palette className="h-5 w-5" />
          <div>
            <h2>Тема приложения</h2>
            <p>Две базовые темы доступны всем, цветной набор входит в Voople+.</p>
          </div>
        </div>
        <AppThemeSelector unlockedThemeIds={unlockedThemeIds} />
        {!subscription.data?.active ? (
          <Link href="/shop?tab=plus" className="settings-subscription-link">
            Открыть набор тем Voople+
          </Link>
        ) : null}
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <Type className="h-5 w-5" />
          <div>
            <h2>Размер текста</h2>
            <p>Меняет масштаб текста во всём приложении.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {FONT_OPTIONS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={preferences.fontScale === option.id}
              onClick={() => updatePreferences({ fontScale: option.id })}
              className={cn("settings-choice", preferences.fontScale === option.id && "settings-choice--active")}
            >
              <span style={{ fontSize: `${0.95 + index * 0.17}rem` }} className="font-semibold">{option.sample}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
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
            <div><p className="font-medium">Показывать статус онлайн</p><p>Отображает индикатор присутствия возле аватаров.</p></div>
            <input type="checkbox" className="settings-switch" checked={preferences.showPresence} onChange={(event) => updatePreferences({ showPresence: event.target.checked })} />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <h2>Безопасность</h2>
            <p>Вход без пароля уменьшает риск повторного использования паролей.</p>
          </div>
        </div>
        <div className="settings-security-card">
          <KeyRound className="h-5 w-5 text-(--theme-accent)" />
          <div>
            <p className="font-medium">Код подтверждения по email</p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">Voople отправляет одноразовый шестизначный код. Никому его не сообщайте.</p>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <Scale className="h-5 w-5" />
          <div>
            <h2>Документы и информация</h2>
            <p>Условия использования, способы оплаты, доставка цифровых товаров и контакты.</p>
          </div>
        </div>
        <LegalLinks className="settings-legal-links" />
      </section>
    </div>
  );
}
