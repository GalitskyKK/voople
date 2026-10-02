import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, jsonb, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  payload: jsonb("payload").notNull().default({}),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").notNull().default(0),
  maxPerUser: integer("max_per_user").notNull().default(1),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("promo_codes_code_unique").on(t.code),
  check("promo_codes_max_per_user_check", sql`${t.maxPerUser} >= 1`),
  check("promo_codes_redemption_count_check", sql`${t.redemptionCount} >= 0`),
  index("promo_codes_active_idx").on(t.isActive, t.code),
]);

export const promoRedemptions = pgTable("promo_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  promoCodeId: uuid("promo_code_id").notNull(),
  userId: uuid("user_id").notNull(),
  referenceType: varchar("reference_type", { length: 40 }),
  referenceId: varchar("reference_id", { length: 100 }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  foreignKey({ name: "promo_redemptions_promo_code_id_fkey", columns: [t.promoCodeId], foreignColumns: [promoCodes.id] }).onDelete("cascade"),
  foreignKey({ name: "promo_redemptions_user_id_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  index("promo_redemptions_promo_user_idx").on(t.promoCodeId, t.userId),
  index("promo_redemptions_user_idx").on(t.userId, t.redeemedAt.desc()),
]);
