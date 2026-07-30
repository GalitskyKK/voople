import type { PostViewModel } from "@/types/domain";

export type DesktopFeedTab = "overview" | "following";

export type DesktopPost = PostViewModel;

export type DesktopFeedPage = {
  items: DesktopPost[];
  nextCursor?: string;
};

export function parseDesktopFeedPage(value: unknown): DesktopFeedPage {
  if (!value || typeof value !== "object") throw new Error("Сервер вернул пустой ответ");
  const page = value as Partial<DesktopFeedPage>;
  if (!Array.isArray(page.items)) throw new Error("Некорректный формат ленты");
  return { items: page.items, nextCursor: page.nextCursor };
}
