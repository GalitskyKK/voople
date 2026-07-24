import { parseDatabaseDate } from "./database-date";

export function formatRelativeTime(iso: string | Date): string {
  const then = parseDatabaseDate(iso);
  const diff = Date.now() - then.getTime();
  if (diff < 60_000) return "только что";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} мин. назад`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} ч. назад`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days} д. назад`;

  return then.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
