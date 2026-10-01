import { sql } from "drizzle-orm";
import { check, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { chats, users } from "./schema";

export const groupCharges = pgTable("group_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rootGroupId: uuid("root_group_id").references(() => chats.id, { onDelete: "set null" }),
  origin: varchar("origin", { length: 32 }).notNull(),
  sourceReference: varchar("source_reference", { length: 200 }).notNull().unique(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  movedAt: timestamp("moved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  originCheck: check("group_charges_origin_check", sql`${table.origin} IN ('included_voople_plus', 'standalone')`),
  sourceCheck: check("group_charges_source_reference_check", sql`length(btrim(${table.sourceReference})) > 0`),
  validity: check("group_charges_validity", sql`isfinite(${table.validFrom}) AND isfinite(${table.validUntil}) AND ${table.validUntil} > ${table.validFrom}`),
  assignmentTimes: check("group_charges_assignment_times", sql`(${table.assignedAt} IS NULL) = (${table.movedAt} IS NULL) AND (${table.rootGroupId} IS NULL OR ${table.assignedAt} IS NOT NULL) AND (${table.assignedAt} IS NULL OR ${table.movedAt} >= ${table.assignedAt})`),
  oneIncluded: uniqueIndex("group_charges_one_included_per_owner").on(table.ownerUserId).where(sql`${table.origin} = 'included_voople_plus' AND ${table.revokedAt} IS NULL`),
  activeGroup: index("group_charges_active_group_idx").on(table.rootGroupId, table.validUntil).where(sql`${table.revokedAt} IS NULL`),
}));
