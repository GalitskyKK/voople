export const FREE_NICKNAME_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export function isFreeNicknameColor(value: string): boolean {
  const normalized = value.toLowerCase();
  return FREE_NICKNAME_COLORS.some((color) => color === normalized);
}
