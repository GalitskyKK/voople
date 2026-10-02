import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const paymentIntents = pgTable("payment_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: varchar("kind", { length: 30 }).notNull(),
  amountRub: integer("amount_rub").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  provider: varchar("provider", { length: 30 }).notNull().default("yookassa"),
  externalId: varchar("external_id", { length: 200 }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  foreignKey({ name: "payment_intents_user_id_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  check("payment_intents_amount_rub_check", sql`${t.amountRub} > 0`),
  index("payment_intents_user_idx").on(t.userId, t.createdAt.desc()),
  uniqueIndex("payment_intents_external_uidx").on(t.provider, t.externalId).where(sql`${t.externalId} IS NOT NULL`),
]);

export const subscriptionFulfillments = pgTable("subscription_fulfillments", {
  externalId: varchar("external_id", { length: 200 }).primaryKey(),
  userId: uuid("user_id").notNull(),
  provider: varchar("provider", { length: 40 }).notNull(),
  periodDays: integer("period_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  foreignKey({ name: "subscription_fulfillments_user_id_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  check("subscription_fulfillments_period_days_check", sql`${t.periodDays} > 0 AND ${t.periodDays} <= 3650`),
]);
