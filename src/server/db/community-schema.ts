import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { chats, users } from "./schema";

export const groupCustomizations = pgTable("group_customization", {
  chatId: uuid("chat_id").primaryKey().references(() => chats.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 160 }),
  icon: varchar("icon", { length: 16 }),
  avatarKey: varchar("avatar_key", { length: 512 }),
  publicSlug: varchar("public_slug", { length: 32 }).unique(),
  accentColor: varchar("accent_color", { length: 7 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupBoosts = pgTable(
  "group_boosts",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({ chatIdx: index("group_boosts_chat_idx").on(table.chatId) }),
);
