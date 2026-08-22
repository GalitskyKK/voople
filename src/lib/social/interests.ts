export const MAX_USER_INTERESTS = 10;
export const MAX_GROUP_TOPICS = 5;

export function uniqueInterestSlugs(values: readonly string[], limit: number) {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (unique.length > limit) throw new Error(`Можно выбрать не больше ${limit}`);
  return unique;
}
