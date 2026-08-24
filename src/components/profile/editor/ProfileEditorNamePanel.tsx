"use client";

import { RotateCcw } from "lucide-react";

import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { displayNamePresentation, NICKNAME_EFFECTS, NICKNAME_FONTS } from "@/lib/customization/display-name-style";
import { FREE_NICKNAME_COLORS } from "@/lib/customization/nickname-options";
import type { NicknameFont } from "@/lib/customization/types";
import { cn } from "@/lib/utils";

import type { ProfileEditorController } from "./useProfileEditorController";

export function ProfileEditorNamePanel({ controller, hasVooplePlus }: { controller: ProfileEditorController; hasVooplePlus: boolean }) {
  const value = controller.equipped;
  return (
    <div className="mt-5 space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Шрифт</h3><VooplePlusBadge locked={!hasVooplePlus} /></div><p className="mt-1 text-xs text-[var(--app-muted)]">Варианты Вупл+ можно примерить до подписки.</p></div>
          {value && (value.nicknameColor || value.nicknameFont !== "sans" || value.nicknameEffect !== "plain") ? <button type="button" className="profile-editor-reset" onClick={() => controller.clearSlot("nickname_style")}><RotateCcw className="h-3.5 w-3.5" />Сбросить</button> : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NICKNAME_FONTS.map((font) => {
            const active = (value?.nicknameFont ?? "sans") === font.id;
            const locked = font.id !== "sans" && !hasVooplePlus;
            const sample = displayNamePresentation({ color: value?.nicknameColor, gradient: false, font: font.id, effect: "plain" });
            return <button key={font.id} type="button" disabled={controller.cosmeticBusy} aria-pressed={active} onClick={() => controller.commitPatch({ nicknameFont: font.id }, locked)} className={cn("profile-editor-name-effect", active && "profile-editor-name-effect--active")} title={font.label}><span className="text-xl font-semibold" style={sample.style}>{font.sample}</span><span className="mt-1 block text-[11px] text-[var(--app-muted)]">{font.label}</span></button>;
          })}
        </div>
      </section>
      <section className="space-y-3">
        <div><h3 className="text-sm font-semibold">Эффект</h3><p className="mt-1 text-xs text-[var(--app-muted)]">Результат сразу виден на карточке слева.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NICKNAME_EFFECTS.map((effect) => {
            const active = (value?.nicknameEffect ?? (value?.nicknameGradient ? "gradient" : "plain")) === effect.id;
            const locked = effect.id !== "plain" && !hasVooplePlus;
            const sample = displayNamePresentation({ color: value?.nicknameColor ?? "#a78bfa", gradient: effect.id === "gradient", font: (value?.nicknameFont as NicknameFont | undefined) ?? "sans", effect: effect.id });
            return <button key={effect.id} type="button" disabled={controller.cosmeticBusy} aria-pressed={active} onClick={() => controller.commitPatch({ nicknameEffect: effect.id, nicknameGradient: effect.id === "gradient" }, locked)} className={cn("profile-editor-name-effect", active && "profile-editor-name-effect--active")}><span className={sample.className} style={sample.style}>{effect.label}</span></button>;
          })}
        </div>
      </section>
      <section className="space-y-3">
        <div><h3 className="text-sm font-semibold">Цвет</h3><p className="mt-1 text-xs text-[var(--app-muted)]">Базовая палитра доступна всем. Точный оттенок — функция Вупл+.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={controller.cosmeticBusy} aria-label="Цвет темы" aria-pressed={!value?.nicknameColor} onClick={() => controller.commitPatch({ nicknameColor: null })} className={cn("grid h-10 w-10 place-items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]", !value?.nicknameColor && "ring-2 ring-[var(--theme-accent)]")}><RotateCcw className="h-4 w-4" /></button>
          {FREE_NICKNAME_COLORS.map((color) => <button key={color} type="button" disabled={controller.cosmeticBusy} aria-label={`Цвет имени ${color}`} aria-pressed={value?.nicknameColor?.toLowerCase() === color} onClick={() => controller.commitPatch({ nicknameColor: color })} className={cn("h-10 w-10 rounded-xl border border-black/10 shadow-inner transition hover:scale-105", value?.nicknameColor?.toLowerCase() === color && "ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--app-surface)]")} style={{ backgroundColor: color }} />)}
          <label className={cn("relative grid h-10 min-w-24 cursor-pointer place-items-center overflow-hidden rounded-xl border border-[var(--app-border)] px-3 text-xs font-medium", !hasVooplePlus && "after:absolute after:inset-0 after:bg-[color-mix(in_srgb,var(--app-surface)_30%,transparent)]")} style={{ background: `linear-gradient(120deg, ${value?.nicknameColor ?? "#8b5cf6"}, #22d3ee)`, color: "#fff" }}>
            Свой цвет
            <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={value?.nicknameColor ?? "#8b5cf6"} onChange={(event) => controller.previewPatch({ nicknameColor: event.target.value }, !hasVooplePlus)} onBlur={(event) => controller.commitPatch({ nicknameColor: event.target.value }, !hasVooplePlus)} />
          </label>
        </div>
      </section>
    </div>
  );
}
