"use client";

import { Palette, Type } from "lucide-react";

import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { AppThemeSelector } from "@/components/theme/AppThemeSelector";
import type { FontScale } from "@/lib/app-preferences";
import type { AppThemeId } from "@/lib/app-themes";
import { cn } from "@/lib/utils";

const FONT_OPTIONS: Array<{ id: FontScale; label: string; size: string }> = [
  { id: "small", label: "Компактный текст", size: "0.95rem" },
  { id: "standard", label: "Стандартный текст", size: "1.08rem" },
  { id: "large", label: "Крупный текст", size: "1.22rem" },
];

export function AppearanceSettings({
  unlockedThemeIds,
  subscriptionAction,
}: {
  unlockedThemeIds: AppThemeId[];
  subscriptionAction?: React.ReactNode;
}) {
  const { preferences, updatePreferences } = useAppPreferences();

  return (
    <div className="space-y-5">
      <section id="appearance" className="settings-section">
        <div className="settings-section__header">
          <Palette className="h-5 w-5" />
          <div>
            <h2>Оформление</h2>
            <p>Базовые темы доступны всем, дополнительные цветовые темы входят в Вупл+.</p>
          </div>
        </div>
        <AppThemeSelector
          unlockedThemeIds={unlockedThemeIds}
          premiumAction={subscriptionAction}
        />
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <Type className="h-5 w-5" />
          <div>
            <h2>Размер текста</h2>
            <p>Применяется ко всему интерфейсу на этом устройстве.</p>
          </div>
        </div>
        <div className="settings-font-scale" aria-label="Размер текста">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={preferences.fontScale === option.id}
              onClick={() => updatePreferences({ fontScale: option.id })}
              className={cn(
                "settings-font-scale__option",
                preferences.fontScale === option.id && "settings-font-scale__option--active",
              )}
            >
              <span style={{ fontSize: option.size }} aria-hidden>Aа</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
