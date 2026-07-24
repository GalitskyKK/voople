/** Post text can be edited only within this window after publish. */
import { parseDatabaseDate } from "@/lib/format/database-date";

export const POST_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canEditPostByAge(createdAtIso: string, nowMs = Date.now()): boolean {
  const created = parseDatabaseDate(createdAtIso).getTime();
  if (Number.isNaN(created)) return false;
  return nowMs - created <= POST_EDIT_WINDOW_MS;
}
