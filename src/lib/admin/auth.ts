const ADMIN_USER_IDS = new Set(
  (process.env["VOOPLE_ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

/** Server-only: allowlist из `VOOPLE_ADMIN_USER_IDS` (UUID через запятую). */
export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId || ADMIN_USER_IDS.size === 0) return false;
  return ADMIN_USER_IDS.has(userId);
}

export function assertAdminConfigured(): void {
  if (ADMIN_USER_IDS.size === 0) {
    throw new Error("Админка не настроена: задайте VOOPLE_ADMIN_USER_IDS");
  }
}
