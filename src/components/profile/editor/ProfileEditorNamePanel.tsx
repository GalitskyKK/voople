"use client";

import { RotateCcw } from "lucide-react";

import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { displayNamePresentation, NICKNAME_EFFECTS, NICKNAME_FONTS } from "@/lib/customization/display-name-style";
import { isValidNicknameColor } from "@/lib/customization/nickname-color";
import { FREE_NICKNAME_COLORS, isFreeNicknameColor } from "@/lib/customization/nickname-options";
import type { NicknameFont } from "@/lib/customization/types";
import { cn } from "@/lib/utils";

import type { ProfileEditorController } from "./useProfileEditorController";

export function ProfileEditorNamePanel({ controller }: { controller: ProfileEditorController; hasVooplePlus: boolean }) {
  const value = controller.equipped;
  const selectCustomNicknameColor = value?.selectCustomNicknameColor ?? false;
  const selectPremiumNicknameFont = value?.selectPremiumNicknameFont ?? false;
  const selectPremiumNicknameEffect = value?.selectPremiumNicknameEffect ?? false;
  return (
    <div className="mt-5 space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Шрифт</h3><VooplePlusBadge locked={!selectPremiumNicknameFont} /></div><p className="mt-1 text-xs text-[var(--app-muted)]">Премиум-шрифты доступны с Вупл+ или Style.</p></div>
          {value && (value.nicknameColor || value.nicknameFont !== "sans" || value.nicknameEffect !== "plain") ? <button type="button" className="profile-editor-reset" onClick={() => controller.clearSlot("nickname_style")}><RotateCcw className="h-3.5 w-3.5" />Сбросить</button> : null}
        </div>
        {value?.nicknameFont && value.nicknameFont !== "sans" && !selectPremiumNicknameFont ? <p className="text-xs text-[var(--app-muted)]">Выбранный шрифт сохранён. Пока нет доступа, имя отображается стандартным шрифтом.</p> : null}
        <div className="grid grid-cols-3 gap-2">
          {NICKNAME_FONTS.map((font) => {
            const active = (value?.nicknameFont ?? "sans") === font.id;
            const locked = font.id !== "sans" && !selectPremiumNicknameFont;
            const sample = displayNamePresentation({ color: value?.effectiveNicknameColor, gradient: false, font: font.id, effect: "plain" });
            return <button key={font.id} type="button" disabled={controller.cosmeticBusy || locked} aria-pressed={active} aria-label={`${font.label}${locked ? " — нужен Вупл+ или Style" : ""}`} onClick={() => controller.commitPatch({ nicknameFont: font.id })} className={cn("profile-editor-name-effect", active && "profile-editor-name-effect--active")} title={font.label}><span className="text-xl font-semibold" style={sample.style}>{font.sample}</span><span className="mt-1 block text-[11px] text-[var(--app-muted)]">{font.label}</span></button>;
          })}
        </div>
      </section>
      <section className="space-y-3">
        <div><h3 className="text-sm font-semibold">Эффект</h3><p className="mt-1 text-xs text-[var(--app-muted)]">Премиум-эффекты доступны с Вупл+ или Style.</p></div>
        {(value?.nicknameEffect && value.nicknameEffect !== "plain" || value?.nicknameGradient) && !selectPremiumNicknameEffect ? <p className="text-xs text-[var(--app-muted)]">Выбранный эффект сохранён. Пока нет доступа, имя отображается без эффекта.</p> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NICKNAME_EFFECTS.map((effect) => {
            const active = (value?.nicknameEffect ?? (value?.nicknameGradient ? "gradient" : "plain")) === effect.id;
            const locked = effect.id !== "plain" && !selectPremiumNicknameEffect;
            const sample = displayNamePresentation({ color: value?.effectiveNicknameColor ?? "var(--theme-accent)", gradient: effect.id === "gradient", font: (value?.effectiveNicknameFont as NicknameFont | undefined) ?? "sans", effect: effect.id });
            return <button key={effect.id} type="button" disabled={controller.cosmeticBusy || locked} aria-pressed={active} aria-label={`${effect.label}${locked ? " — нужен Вупл+ или Style" : ""}`} onClick={() => controller.commitPatch({ nicknameEffect: effect.id })} className={cn("profile-editor-name-effect", active && "profile-editor-name-effect--active")}><span className={sample.className} style={sample.style}>{effect.label}</span></button>;
          })}
        </div>
      </section>
      <section className="space-y-3">
        <div><h3 className="text-sm font-semibold">Цвет</h3><p className="mt-1 text-xs text-[var(--app-muted)]">Базовая палитра доступна всем. Точный оттенок доступен с Вупл+ или Style.</p></div>
        {isValidNicknameColor(value?.nicknameColor) && !isFreeNicknameColor(value.nicknameColor) && !selectCustomNicknameColor ? <p className="text-xs text-[var(--app-muted)]">Выбранный цвет сохранён. Пока нет доступа, имя отображается цветом темы.</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={controller.cosmeticBusy} aria-label="Цвет темы" aria-pressed={!value?.nicknameColor} onClick={() => controller.commitPatch({ nicknameColor: null })} className={cn("grid h-11 w-11 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]", !value?.nicknameColor && "ring-2 ring-[var(--theme-accent)]")}><RotateCcw className="h-4 w-4" /></button>
          {FREE_NICKNAME_COLORS.map((color) => <button key={color} type="button" disabled={controller.cosmeticBusy} aria-label={`Цвет имени ${color}`} aria-pressed={value?.nicknameColor?.toLowerCase() === color} onClick={() => controller.commitPatch({ nicknameColor: color })} className={cn("h-11 w-11 rounded-xl border border-black/10 shadow-inner transition hover:scale-105", value?.nicknameColor?.toLowerCase() === color && "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--app-surface)]")} style={{ backgroundColor: color }} />)}
          <label className={cn("relative grid h-11 min-w-24 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-medium focus-within:ring-2 focus-within:ring-[var(--theme-accent)]", !selectCustomNicknameColor && "opacity-50")}>
            Свой цвет
            <input type="color" aria-label="Свой цвет имени" disabled={controller.cosmeticBusy || !selectCustomNicknameColor} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" value={isValidNicknameColor(value?.nicknameColor) ? value.nicknameColor : "#8b5cf6"} onChange={(event) => { if (selectCustomNicknameColor) controller.commitPatch({ nicknameColor: event.target.value }); }} />
          </label>
        </div>
      </section>
    </div>
  );
}
