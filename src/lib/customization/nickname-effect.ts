import type { NicknameEffect } from "./types";

export const NICKNAME_EFFECT_IDS = ["plain", "gradient", "neon", "highlight", "outline"] as const;

export function assertNicknameEffectSelectionAllowed(effect: string | null | undefined, gradient: boolean | null | undefined, allowed: boolean) {
  if (effect != null && !NICKNAME_EFFECT_IDS.includes(effect as NicknameEffect)) throw new Error("Неизвестный эффект имени");
  if (((effect != null && effect !== "plain") || gradient === true) && !allowed) {
    throw new Error("Эффект требует Вупл+ или Style");
  }
}

/** Projection only. A valid explicit effect wins over the legacy gradient flag. */
export function resolveEffectiveNicknameEffect(saved: string | null | undefined, gradient: boolean | null | undefined, allowed: boolean): { effect: NicknameEffect; gradient: boolean } {
  if (!allowed) return { effect: "plain", gradient: false };
  // Missing legacy effect may use its gradient flag; malformed values fail closed.
  const effect = saved == null ? (gradient === true ? "gradient" : "plain")
    : NICKNAME_EFFECT_IDS.includes(saved as NicknameEffect) ? saved as NicknameEffect : "plain";
  return { effect, gradient: effect === "gradient" };
}
