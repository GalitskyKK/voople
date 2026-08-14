import { bigint, index, integer, jsonb, numeric, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { posts, postMediaTypeEnum, users } from "./schema";

export const postMedia = pgTable(
  "post_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    type: postMediaTypeEnum("type").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: numeric("duration_seconds", { precision: 10, scale: 3 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    postPositionUnique: uniqueIndex("post_media_post_position_unique").on(table.postId, table.position),
    postIdx: index("post_media_post_idx").on(table.postId, table.position),
  }),
);

export const postDrafts = pgTable("post_drafts", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 1000 }),
  media: jsonb("media").notNull().default([]),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
