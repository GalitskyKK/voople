import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const userWallets = pgTable("user_wallets", {
  userId: uuid("user_id").primaryKey(),
  balanceCoins: integer("balance_coins").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  check("user_wallets_balance_coins_check", sql`${t.balanceCoins} >= 0`),
  foreignKey({ name: "user_wallets_user_id_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade"),
]);

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  kind: varchar("kind", { length: 30 }).notNull(),
  referenceType: varchar("reference_type", { length: 30 }),
  referenceId: varchar("reference_id", { length: 100 }),
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  idempotencyKey: varchar("idempotency_key", { length: 200 }),
}, t => [
  foreignKey({ name: "wallet_transactions_user_id_fkey", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  check("wallet_transactions_balance_after_check", sql`${t.balanceAfter} >= 0`),
  index("wallet_transactions_user_idx").on(t.userId, t.createdAt.desc()),
  uniqueIndex("wallet_transactions_idempotency_uidx").on(t.userId, t.idempotencyKey)
    .where(sql`${t.idempotencyKey} IS NOT NULL`),
]);
