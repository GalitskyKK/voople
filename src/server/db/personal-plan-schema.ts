import { sql } from "drizzle-orm";
import { check, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const personalPlanGrants = pgTable("personal_plan_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planKind: varchar("plan_kind", { length: 16 }).notNull(),
  sourceReference: varchar("source_reference", { length: 200 }).notNull().unique(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  kind: check("personal_plan_grants_kind", sql`${table.planKind} IN ('style', 'full')`),
  source: check("personal_plan_grants_source", sql`length(btrim(${table.sourceReference})) > 0 AND ${table.sourceReference} = btrim(${table.sourceReference}) AND ${table.sourceReference} !~ '^[[:space:]]|[[:space:]]$'`),
  validity: check("personal_plan_grants_validity", sql`isfinite(${table.validFrom}) AND isfinite(${table.validUntil}) AND ${table.validUntil} > ${table.validFrom}`),
  activeUser: index("personal_plan_grants_active_user_idx").on(table.userId, table.validUntil).where(sql`${table.revokedAt} IS NULL`),
}));
