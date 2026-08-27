export const SIDEBAR_PREFERENCE_STORAGE_KEY = "voople:sidebar-collapsed:v1";
export const SIDEBAR_PREFERENCE_EVENT = "voople:sidebar-preference";

export const COMPACT_SIDEBAR_WIDTH = "72px";
export const EXPANDED_SIDEBAR_WIDTH = "216px";

/**
 * Compact is the safe default: it preserves the primary content budget before
 * a user has deliberately pinned the expanded navigation.
 */
export function resolveSidebarCollapsed(storedValue: string | null) {
  return storedValue !== "false";
}
