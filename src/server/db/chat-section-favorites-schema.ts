import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { chatMembers, chats, users } from "./schema";

export const userChatSectionFavorites = pgTable(
  "user_chat_section_favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.sectionId] }),
    slotUnique: uniqueIndex(
      "user_chat_section_favorites_user_group_position_unique",
    ).on(table.userId, table.groupId, table.position),
    groupMembershipFk: foreignKey({
      columns: [table.groupId, table.userId],
      foreignColumns: [chatMembers.chatId, chatMembers.userId],
      name: "user_chat_section_favorites_group_membership_fk",
    }).onDelete("cascade"),
    groupIdx: index("user_chat_section_favorites_group_idx").on(
      table.userId,
      table.groupId,
      table.position,
    ),
  }),
);
