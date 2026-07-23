"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { resolveAppThemeAssets } from "@/lib/app-theme-assets";
import { APP_THEMES, type AppThemeId } from "@/lib/app-themes";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useAppTheme } from "./AppThemeProvider";

type AppThemeSelectorProps = {
  unlockedThemeIds?: AppThemeId[];
  /** Сохранять выбор в БД (для авторизованных). */
  persistToAccount?: boolean;
};

function ThemePreviewSwatches({
  background,
  surface,
  accent,
}: {
  background: string;
  surface: string;
  accent: string;
}) {
  return (
    <span className="flex gap-1">
      <span className="h-4 w-8 rounded-full" style={{ background }} aria-hidden />
      <span className="h-4 w-8 rounded-full" style={{ background: surface }} aria-hidden />
      <span className="h-4 w-8 rounded-full" style={{ background: accent }} aria-hidden />
    </span>
  );
}

export function AppThemeSelector({
  unlockedThemeIds = [],
  persistToAccount = true,
}: AppThemeSelectorProps) {
  const { themeId, setThemeId } = useAppTheme();
  const unlocked = new Set<AppThemeId>(unlockedThemeIds);
  const utils = trpc.useUtils();
  const updateTheme = trpc.customization.update.useMutation({
    onSuccess: () => {
      void utils.customization.getEquipped.invalidate();
    },
  });

  const handleSelect = (nextThemeId: AppThemeId) => {
    const previousThemeId = themeId;
    setThemeId(nextThemeId);
    if (persistToAccount) {
      updateTheme.mutate(
        { appThemeId: nextThemeId },
        { onError: () => setThemeId(previousThemeId) },
      );
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Тема приложения</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {APP_THEMES.map((theme) => {
          const active = theme.id === themeId;
          const available = !theme.paid || unlocked.has(theme.id);
          const previewUrl = resolveAppThemeAssets(theme, { preferStaticBackground: true }).backgroundUrl;

          return (
            <ThemeOptionButton
              key={theme.id}
              theme={theme}
              active={active}
              available={available}
              busy={updateTheme.isPending}
              previewUrl={previewUrl}
              onSelect={() => handleSelect(theme.id)}
            />
          );
        })}
      </div>
      {updateTheme.error ? <p className="text-xs text-red-300">{updateTheme.error.message}</p> : null}
    </section>
  );
}

type ThemeOptionButtonProps = {
  theme: (typeof APP_THEMES)[number];
  active: boolean;
  available: boolean;
  busy: boolean;
  previewUrl: string | null;
  onSelect: () => void;
};

function ThemeOptionButton({
  theme,
  active,
  available,
  busy,
  previewUrl,
  onSelect,
}: ThemeOptionButtonProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const showAssetPreview = Boolean(previewUrl) && !previewFailed;

  return (
    <button
      type="button"
      disabled={!available || busy}
      onClick={onSelect}
      className={cn(
        "rounded-xl border p-3 text-left transition disabled:cursor-default disabled:opacity-55",
        active ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)] bg-[var(--app-surface-soft)] hover:border-[var(--app-border-strong)] hover:bg-[color-mix(in_srgb,var(--app-surface-soft)_80%,white)]",
      )}
      aria-pressed={active}
    >
      <span className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-[var(--foreground)]">{theme.name}</span>
        {!available && <Lock className="h-4 w-4 text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]" />}
      </span>
      <span className="mb-3 block text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">{theme.description}</span>
      {showAssetPreview ? (
        <span className="relative block h-10 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- local theme preview thumbnails */}
          <img
            src={previewUrl!}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
          <span
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${theme.tokens.background}cc, transparent)` }}
            aria-hidden
          />
        </span>
      ) : (
        <ThemePreviewSwatches
          background={theme.tokens.background}
          surface={theme.tokens.surface}
          accent={theme.tokens.accent}
        />
      )}
    </button>
  );
}
