"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { DEFAULT_THEME } from "@/lib/constants/theme";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { VooplePlusFeatureSurface } from "@/components/subscription/VooplePlusFeatureSurface";

type ProfileThemePickerProps = {
  /** Текущие цвета из equipped (null → тема профиля не задана). */
  themePrimary: string | null;
  themeAccent: string | null;
  /** Активна ли подписка Voople+ (фича премиальная). */
  isPlus: boolean;
  /** Обновить превью/equipped после сохранения. */
  onSaved: () => void;
};

const FALLBACK_PRIMARY = DEFAULT_THEME.themePrimary;
const FALLBACK_ACCENT = DEFAULT_THEME.themeAccent;

export function ProfileThemePicker({
  themePrimary,
  themeAccent,
  isPlus,
  onSaved,
}: ProfileThemePickerProps) {
  const active = Boolean(themePrimary || themeAccent);
  const [primary, setPrimary] = useState(themePrimary ?? FALLBACK_PRIMARY);
  const [accent, setAccent] = useState(themeAccent ?? FALLBACK_ACCENT);

  const update = trpc.customization.update.useMutation({ onSuccess: onSaved });

  const apply = (nextPrimary: string | null, nextAccent: string | null) =>
    update.mutate({ themePrimary: nextPrimary, themeAccent: nextAccent });

  const gradient = `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;

  const content = (
    <>
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--theme-accent)]" />
        <span className="text-sm font-semibold text-[var(--foreground)]">Предпросмотр цветов</span>
      </div>
      <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
        Два цвета — градиент карточки профиля. Без темы карточка следует теме приложения.
      </p>

      <div
        className="h-16 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]"
        style={{ background: gradient }}
        aria-hidden
      />

      <div className="flex flex-wrap items-end gap-4">
        <ColorField
          label="Основной"
          value={primary}
          disabled={!isPlus || update.isPending}
          onChange={setPrimary}
        />
        <ColorField
          label="Дополнительный"
          value={accent}
          disabled={!isPlus || update.isPending}
          onChange={setAccent}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!isPlus || update.isPending}
            onClick={() => apply(primary, accent)}
          >
            {update.isPending ? "Сохранение…" : active ? "Обновить" : "Применить"}
          </Button>
          {active && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => {
                setPrimary(FALLBACK_PRIMARY);
                setAccent(FALLBACK_ACCENT);
                apply(null, null);
              }}
            >
              Сбросить
            </Button>
          )}
        </div>
      </div>

      {update.error && <p className="text-xs text-red-400">{update.error.message}</p>}
    </>
  );

  return (
    <VooplePlusFeatureSurface
      title="Точные цвета профиля"
      description="Соберите собственный градиент карточки. До подписки цвета можно посмотреть в полноценном превью."
      locked={!isPlus}
    >
      {content}
    </VooplePlusFeatureSurface>
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">{label}</span>
      <span
        className={cn(
          "flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2 py-1.5",
          disabled && "opacity-60",
        )}
      >
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
          aria-label={label}
        />
        <span className="font-mono text-xs uppercase text-[color-mix(in_srgb,var(--foreground)_75%,transparent)]">
          {value}
        </span>
      </span>
    </label>
  );
}
