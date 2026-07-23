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

const MOOD_LABELS = [
  "На паузе",
  "Очень тихо",
  "Не в ресурсе",
  "Задумчиво",
  "Ровно",
  "Спокойно",
  "Хорошо",
  "На подъёме",
  "Сияю",
  "Горю",
] as const;

const MOOD_COLORS = [
  "#64748b",
  "#7180a8",
  "#7c83c7",
  "#818cf8",
  "#8b7ec8",
  "#a878d1",
  "#c76fae",
  "#e06f98",
  "#f2767d",
  "#fb7b55",
] as const;

function moodIndex(value: number) {
  return Math.max(1, Math.min(10, Math.round(value))) - 1;
}

export function getMoodEmoji(value: number) {
  return MOOD_EMOJIS[value] ?? "😐";
}

export function getMoodLabel(value: number) {
  return MOOD_LABELS[moodIndex(value)];
}

export function getMoodColor(value: number) {
  return MOOD_COLORS[moodIndex(value)];
}
