export type GroupBoostLevel = 0 | 1 | 3 | 6 | 12 | 24;

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
