export type GroupBoostLevel = 0 | 1 | 3 | 6 | 12 | 24;

export type GroupPerkDefinition = {
  id: string;
  name: string;
  description: string;
  cost: number;
  milestone: Exclude<GroupBoostLevel, 0>;
  icon: "palette" | "smile" | "image" | "upload" | "tag" | "link" | "roles" | "hd";
};

export const GROUP_PERKS: readonly GroupPerkDefinition[] = [
  { id: "accent", name: "Цвет сообщества", description: "Фирменный accent в группе", cost: 1, milestone: 1, icon: "palette" },
  { id: "emoji_sound", name: "Эмодзи и звуки", description: "Расширенный набор реакций и soundboard", cost: 1, milestone: 3, icon: "smile" },
  { id: "banner", name: "Расширенное оформление", description: "Баннер и animated identity", cost: 2, milestone: 6, icon: "image" },
  { id: "uploads", name: "Большие файлы", description: "Лимит загрузки до 50–100 МБ", cost: 3, milestone: 6, icon: "upload" },
  { id: "tag", name: "Тег сообщества", description: "Короткая метка рядом с названием", cost: 2, milestone: 12, icon: "tag" },
  { id: "vanity", name: "Постоянная ссылка", description: "Запоминающийся invite без срока", cost: 2, milestone: 24, icon: "link" },
  { id: "roles", name: "Стили ролей", description: "Отдельные цвета владельца и команды", cost: 2, milestone: 24, icon: "roles" },
  { id: "hd", name: "HD-комната", description: "Повышенное качество демонстрации", cost: 3, milestone: 24, icon: "hd" },
] as const;

export function groupBoostLevel(boostCount: number): GroupBoostLevel {
  if (boostCount >= 24) return 24;
  if (boostCount >= 12) return 12;
  if (boostCount >= 6) return 6;
  if (boostCount >= 3) return 3;
  if (boostCount >= 1) return 1;
  return 0;
}

export function groupEmojiLimit(level: GroupBoostLevel) {
  if (level >= 24) return 250;
  if (level >= 12) return 150;
  if (level >= 6) return 100;
  if (level >= 3) return 50;
  if (level >= 1) return 20;
  return 10;
}

export function groupSoundLimit(level: GroupBoostLevel) {
  if (level >= 24) return 48;
  if (level >= 12) return 32;
  if (level >= 6) return 16;
  if (level >= 3) return 8;
  return 0;
}

export function groupFileLimitBytes(level: GroupBoostLevel) {
  if (level >= 12) return 100 * 1024 * 1024;
  if (level >= 6) return 50 * 1024 * 1024;
  return 15 * 1024 * 1024;
}

export function groupBannerEnabled(level: GroupBoostLevel) {
  return level >= 6;
}

export function groupAnimatedIconEnabled(level: GroupBoostLevel) {
  return level >= 3;
}

export function groupAnimatedBannerEnabled(level: GroupBoostLevel) {
  return level >= 12;
}

export function groupTagEnabled(level: GroupBoostLevel) {
  return level >= 12;
}

export function groupVanityInviteEnabled(level: GroupBoostLevel) {
  return level >= 24;
}

export function groupRoleStylesEnabled(level: GroupBoostLevel) {
  return level >= 24;
}

export function screenShareQualityForEntitlements(
  hasVooplePlus: boolean,
  groupLevel: GroupBoostLevel,
): "standard" | "plus" {
  return hasVooplePlus || groupLevel >= 24 ? "plus" : "standard";
}
