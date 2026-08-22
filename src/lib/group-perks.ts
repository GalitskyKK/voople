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
  { id: "animated_icon", name: "Живой значок", description: "Анимированная иконка сообщества", cost: 1, milestone: 3, icon: "image" },
  { id: "emoji_sound", name: "Эмодзи и звуки", description: "Расширенные лимиты реакций и soundboard", cost: 1, milestone: 3, icon: "smile" },
  { id: "animated_banner", name: "Живой баннер", description: "Анимированный баннер и premium-эффекты", cost: 2, milestone: 6, icon: "image" },
  { id: "uploads", name: "Большие файлы", description: "Лимит загрузки до 50–100 МБ", cost: 3, milestone: 6, icon: "upload" },
  { id: "vanity", name: "Красивый адрес", description: "Запоминающийся vanity URL вместо случайного кода", cost: 2, milestone: 24, icon: "link" },
  { id: "roles", name: "Стили ролей", description: "Отдельные цвета владельца и команды", cost: 2, milestone: 24, icon: "roles" },
  { id: "hd", name: "HD-комната", description: "Повышенное качество демонстрации", cost: 3, milestone: 24, icon: "hd" },
] as const;

export type GroupPerkState = GroupPerkDefinition & {
  selected: boolean;
  status: "active" | "available" | "locked" | "suspended";
};

export function resolveGroupPerkStates(input: {
  capacity: number;
  level: GroupBoostLevel;
  selectedIds: readonly string[];
}) {
  const selected = new Set(input.selectedIds);
  let used = 0;
  const perks: GroupPerkState[] = GROUP_PERKS.map((perk) => {
    const isSelected = selected.has(perk.id);
    const unlocked = input.level >= perk.milestone;
    const fits = used + perk.cost <= input.capacity;
    const active = isSelected && unlocked && fits;
    if (active) used += perk.cost;
    return {
      ...perk,
      selected: isSelected,
      status: active
        ? "active"
        : isSelected
          ? "suspended"
          : unlocked
            ? "available"
            : "locked",
    };
  });
  return { perks, used };
}

export function isGroupPerkActive(perks: readonly GroupPerkState[], perkId: string) {
  return perks.some((perk) => perk.id === perkId && perk.status === "active");
}

export function groupBoostLevel(boostCount: number): GroupBoostLevel {
  if (boostCount >= 24) return 24;
  if (boostCount >= 12) return 12;
  if (boostCount >= 6) return 6;
  if (boostCount >= 3) return 3;
  if (boostCount >= 1) return 1;
  return 0;
}

export function groupEmojiLimit(level: GroupBoostLevel, expanded = level >= 1) {
  if (!expanded) return 10;
  if (level >= 24) return 250;
  if (level >= 12) return 150;
  if (level >= 6) return 100;
  if (level >= 3) return 50;
  if (level >= 1) return 20;
  return 10;
}

export function groupSoundLimit(level: GroupBoostLevel, expanded = level >= 3) {
  if (!expanded) return 0;
  if (level >= 24) return 48;
  if (level >= 12) return 32;
  if (level >= 6) return 16;
  if (level >= 3) return 8;
  return 0;
}

export function groupFileLimitBytes(level: GroupBoostLevel, expanded = level >= 6) {
  if (!expanded) return 15 * 1024 * 1024;
  if (level >= 12) return 100 * 1024 * 1024;
  if (level >= 6) return 50 * 1024 * 1024;
  return 15 * 1024 * 1024;
}

export function groupBannerEnabled(_level: GroupBoostLevel) {
  void _level;
  return true;
}

export function groupAnimatedIconEnabled(level: GroupBoostLevel) {
  return level >= 3;
}

export function groupAnimatedBannerEnabled(level: GroupBoostLevel) {
  return level >= 6;
}

export function groupTagEnabled(_level: GroupBoostLevel) {
  void _level;
  return true;
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
  hdPerkEnabled = groupLevel >= 24,
): "standard" | "plus" {
  return hasVooplePlus || hdPerkEnabled ? "plus" : "standard";
}
