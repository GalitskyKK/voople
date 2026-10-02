import type { NicknameFont } from "@/lib/customization/types";

export const NICKNAME_FONT_IDS = ["sans", "serif", "rounded", "mono", "display", "soft"] as const;

export function assertNicknameFontSelectionAllowed(font: string | null | undefined, allowed: boolean) {
  if (font == null) return;
  if (!NICKNAME_FONT_IDS.includes(font as NicknameFont)) throw new Error("Неизвестный шрифт имени");
  if (font !== "sans" && !allowed) throw new Error("Шрифт требует Вупл+ или Style");
}

/** Projection only: never modifies the retained saved preference. */
export function resolveEffectiveNicknameFont(saved: string | null | undefined, allowed: boolean): NicknameFont {
  return allowed && NICKNAME_FONT_IDS.includes(saved as NicknameFont) ? saved as NicknameFont : "sans";
}
