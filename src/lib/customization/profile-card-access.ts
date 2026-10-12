import { DEFAULT_THEME } from "@/lib/constants/theme";
import { getFramePreset } from "./frames-registry";
import type { CardBaseMode } from "./types";

export type ProfileCardCapabilities = {
  selectPremiumProfileFramePreset: boolean;
  selectCustomFrameColor: boolean;
  selectPremiumCardBaseMode: boolean;
  selectProfilePalette: boolean;
};
type ProfileCardFacts = {
  profileFrameId?: string | null; frameColor?: string | null;
  cardBaseMode?: string | null; themePrimary?: string | null; themeAccent?: string | null;
};
const isHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) && value.length === 7;
export function isCustomProfilePaletteChannel(value: string | null | undefined, channel: "themePrimary" | "themeAccent") {
  return value != null && value.toUpperCase() !== DEFAULT_THEME[channel];
}
export function needsProfileCardAccess(patch: ProfileCardFacts) {
  return Boolean(getFramePreset(patch.profileFrameId)?.isPremium || patch.frameColor != null
    || (patch.cardBaseMode != null && patch.cardBaseMode !== "mirror")
    || isCustomProfilePaletteChannel(patch.themePrimary, "themePrimary")
    || isCustomProfilePaletteChannel(patch.themeAccent, "themeAccent"));
}
export function assertProfileCardSelectionAllowed(patch: ProfileCardFacts, access: ProfileCardCapabilities) {
  for (const value of [patch.frameColor, patch.themePrimary, patch.themeAccent]) {
    if (value != null && !isHex(value)) throw new Error("Ожидается HEX-цвет вида #RRGGBB");
  }
  if (patch.cardBaseMode != null && !["mirror", "theme", "plain"].includes(patch.cardBaseMode)) throw new Error("Неизвестная основа карточки");
  if (getFramePreset(patch.profileFrameId)?.isPremium && !access.selectPremiumProfileFramePreset) throw new Error("Премиум-рамка доступна с Вупл+ или Style");
  if (patch.frameColor != null && !access.selectCustomFrameColor) throw new Error("Свой цвет рамки доступен с Вупл+ или Style");
  if (patch.cardBaseMode != null && patch.cardBaseMode !== "mirror" && !access.selectPremiumCardBaseMode) throw new Error("Основа карточки доступна с Вупл+ или Style");
  if ((isCustomProfilePaletteChannel(patch.themePrimary, "themePrimary") || isCustomProfilePaletteChannel(patch.themeAccent, "themeAccent")) && !access.selectProfilePalette) throw new Error("Своя палитра доступна с Вупл+ или Style");
}
export function resolveEffectiveProfileFrameId(saved: unknown, allowed: boolean): string | null {
  if (typeof saved !== "string" || !saved) return null;
  // Non-preset IDs remain Store facts; Style never authorizes their assignment.
  return getFramePreset(saved)?.isPremium && !allowed ? null : saved;
}
export function resolveEffectiveFrameColor(saved: unknown, allowed: boolean): string | null {
  return allowed && isHex(saved) ? saved : null;
}
export function resolveEffectiveCardBaseMode(saved: unknown, allowed: boolean): CardBaseMode {
  return allowed && (saved === "theme" || saved === "plain") ? saved : "mirror";
}
export function resolveEffectiveProfilePalette(primary: unknown, accent: unknown, allowed: boolean) {
  return {
    themePrimary: allowed && isHex(primary) ? primary : DEFAULT_THEME.themePrimary,
    themeAccent: allowed && isHex(accent) ? accent : DEFAULT_THEME.themeAccent,
  };
}
/** Saved aliases stay intact; this projection is pure and usable by editor drafts. */
export function projectProfileCardFacts(saved: ProfileCardFacts, access: ProfileCardCapabilities) {
  const palette = resolveEffectiveProfilePalette(saved.themePrimary, saved.themeAccent, access.selectProfilePalette);
  return { savedProfileFrameId: saved.profileFrameId ?? null, savedFrameColor: saved.frameColor ?? null,
    savedCardBaseMode: saved.cardBaseMode ?? null, savedThemePrimary: saved.themePrimary ?? null, savedThemeAccent: saved.themeAccent ?? null,
    effectiveProfileFrameId: resolveEffectiveProfileFrameId(saved.profileFrameId, access.selectPremiumProfileFramePreset),
    effectiveFrameColor: resolveEffectiveFrameColor(saved.frameColor, access.selectCustomFrameColor),
    effectiveCardBaseMode: resolveEffectiveCardBaseMode(saved.cardBaseMode, access.selectPremiumCardBaseMode),
    effectiveThemePrimary: palette.themePrimary, effectiveThemeAccent: palette.themeAccent,
    selectPremiumProfileFramePreset: access.selectPremiumProfileFramePreset,
    selectCustomFrameColor: access.selectCustomFrameColor,
    selectPremiumCardBaseMode: access.selectPremiumCardBaseMode, selectProfilePalette: access.selectProfilePalette };
}
