import { parseDatabaseDate } from "./database-date";

const TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
});

const DATE_YEAR_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function toDate(iso: string) {
  const date = parseDatabaseDate(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatMessageTime(iso: string) {
  const date = toDate(iso);
  if (!date) return "";
  return TIME_FORMATTER.format(date);
}

export function formatMessageDateLabel(iso: string) {
  const date = toDate(iso);
  if (!date) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";

  const sameYear = date.getFullYear() === now.getFullYear();
  return sameYear ? DATE_FORMATTER.format(date) : DATE_YEAR_FORMATTER.format(date);
}

export function dayKeyFromIso(iso: string) {
  const date = toDate(iso);
  if (!date) return iso;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
