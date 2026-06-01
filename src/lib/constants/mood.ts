export const MOOD_EMOJIS: Record<number, string> = {
  1: "😴",
  2: "😴",
  3: "😔",
  4: "😔",
  5: "😐",
  6: "🙂",
  7: "🙂",
  8: "😊",
  9: "😊",
  10: "🔥",
};

export function getMoodEmoji(value: number) {
  return MOOD_EMOJIS[value] ?? "😐";
}
