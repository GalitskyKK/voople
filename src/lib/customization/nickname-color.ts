import { isFreeNicknameColor } from "./nickname-options";

/** Authorization accepts exact six-digit HEX, never CSS parsing. */
export function isValidNicknameColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function assertNicknameColorSelectionAllowed(value: unknown, selectCustomNicknameColor: boolean): void {
  if (value == null) return;
  if (!isValidNicknameColor(value)) throw new Error("Ожидается HEX-цвет вида #RRGGBB");
  if (!isFreeNicknameColor(value) && !selectCustomNicknameColor) {
    throw new Error("Свой цвет имени доступен с Вупл+ или Style");
  }
}

/** Read-only live projection. Saved preferences and historical snapshots stay intact. */
export function resolveEffectiveNicknameColor(saved: unknown, selectCustomNicknameColor = false): string | null {
  return isValidNicknameColor(saved) && (isFreeNicknameColor(saved) || selectCustomNicknameColor) ? saved : null;
}
