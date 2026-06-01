import { z } from "zod";

const RESERVED = new Set([
  "me",
  "feed",
  "login",
  "register",
  "api",
  "admin",
  "explore",
  "messages",
  "notifications",
  "shop",
  "settings",
  "help",
  "about",
  "voople",
]);

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .min(3, "Минимум 3 символа")
  .max(30, "Максимум 30 символов")
  .regex(/^[a-zA-Z0-9_]+$/, "Только латиница, цифры и _")
  .transform(normalizeUsername)
  .refine((u) => !RESERVED.has(u), "Это имя занято системой");

export type UsernameInput = z.infer<typeof usernameSchema>;
