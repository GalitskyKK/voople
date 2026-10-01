import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, smallint, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { chats, users } from "./schema";

export const groupCustomizations = pgTable("group_customization", {
  chatId: uuid("chat_id").primaryKey().references(() => chats.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 160 }),
  icon: varchar("icon", { length: 16 }),
  avatarKey: varchar("avatar_key", { length: 512 }),
  bannerKey: varchar("banner_key", { length: 512 }),
  tag: varchar("tag", { length: 5 }),
  vanityInviteSlug: varchar("vanity_invite_slug", { length: 32 }),
  ownerRoleColor: varchar("owner_role_color", { length: 7 }),
  adminRoleColor: varchar("admin_role_color", { length: 7 }),
  memberRoleColor: varchar("member_role_color", { length: 7 }),
  publicSlug: varchar("public_slug", { length: 32 }),
  accentColor: varchar("accent_color", { length: 7 }),
  boostGraceUntil: timestamp("boost_grace_until", { withTimezone: true }),
  boostGraceLevel: smallint("boost_grace_level"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  publicSlugUnique: uniqueIndex("group_customization_public_slug_unique").on(table.publicSlug).where(sql`${table.publicSlug} IS NOT NULL`),
  vanitySlugUnique: uniqueIndex("group_customization_vanity_invite_slug_unique").on(table.vanityInviteSlug).where(sql`${table.vanityInviteSlug} IS NOT NULL`),
  accentCheck: check("group_customization_accent_check", sql`${table.accentColor} IS NULL OR ${table.accentColor} ~ '^#[0-9A-Fa-f]{6}$'`),
  publicSlugCheck: check("group_customization_public_slug_check", sql`${table.publicSlug} IS NULL OR ${table.publicSlug} ~ '^[a-z0-9_]{5,32}$'`),
  tagCheck: check("group_customization_tag_format_check", sql`${table.tag} IS NULL OR ${table.tag} ~ '^[[:alnum:]]{2,5}$'`),
  vanitySlugCheck: check("group_customization_vanity_invite_slug_format_check", sql`${table.vanityInviteSlug} IS NULL OR ${table.vanityInviteSlug} ~ '^[a-z0-9_]{5,32}$'`),
  roleColorsCheck: check("group_customization_role_colors_check", sql`(${table.ownerRoleColor} IS NULL OR ${table.ownerRoleColor} ~ '^#[0-9a-fA-F]{6}$') AND (${table.adminRoleColor} IS NULL OR ${table.adminRoleColor} ~ '^#[0-9a-fA-F]{6}$') AND (${table.memberRoleColor} IS NULL OR ${table.memberRoleColor} ~ '^#[0-9a-fA-F]{6}$')`),
}));

export const userGroupProfileTags = pgTable(
  "user_group_profile_tags",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    chatIdx: index("user_group_profile_tags_chat_idx").on(table.chatId),
  }),
);

export const groupBoosts = pgTable(
  "group_boosts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").references(() => chats.id, { onDelete: "cascade" }),
    slot: smallint("slot").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
    movedAt: timestamp("moved_at", { withTimezone: true }).notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    chatIdx: index("group_boosts_chat_idx").on(table.chatId),
    userSlotUnique: uniqueIndex("group_boosts_user_slot_unique").on(table.userId, table.slot),
    idempotencyUnique: uniqueIndex("group_boosts_idempotency_unique").on(table.userId, table.idempotencyKey),
    slotCheck: check("group_boosts_slot_check", sql`${table.slot} >= 1 AND ${table.slot} <= 3`),
  }),
);

export const groupEmojis = pgTable(
  "group_emojis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 32 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    animated: boolean("animated").notNull().default(false),
    rightsConfirmed: boolean("rights_confirmed").notNull().default(false),
    moderationStatus: varchar("moderation_status", { length: 24 }).notNull().default("automated_approved"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    chatNameUnique: uniqueIndex("group_emojis_chat_name_unique").on(table.chatId, table.name),
    chatIdx: index("group_emojis_chat_idx").on(table.chatId, table.createdAt),
  }),
);

export const groupSounds = pgTable(
  "group_sounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 32 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    rightsConfirmed: boolean("rights_confirmed").notNull().default(false),
    moderationStatus: varchar("moderation_status", { length: 24 }).notNull().default("automated_approved"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    chatNameUnique: uniqueIndex("group_sounds_chat_name_unique").on(table.chatId, table.name),
    chatIdx: index("group_sounds_chat_idx").on(table.chatId, table.createdAt),
  }),
);
