import { check, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./schema";

export const friendRequests = pgTable("friend_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: uuid("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userLowId: uuid("user_low_id").generatedAlwaysAs(sql`LEAST(requester_id, addressee_id)`),
  userHighId: uuid("user_high_id").generatedAlwaysAs(sql`GREATEST(requester_id, addressee_id)`),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (table) => ({
  notSelf: check("friend_requests_not_self", sql`${table.requesterId} <> ${table.addresseeId}`),
  statusCheck: check("friend_requests_status_check", sql`${table.status} IN ('pending', 'accepted', 'declined', 'cancelled')`),
  onePendingPair: uniqueIndex("friend_requests_one_pending_pair").on(table.userLowId, table.userHighId).where(sql`${table.status} = 'pending'`),
  addresseePending: index("friend_requests_addressee_pending").on(table.addresseeId, table.createdAt).where(sql`${table.status} = 'pending'`),
  requesterPending: index("friend_requests_requester_pending").on(table.requesterId, table.createdAt).where(sql`${table.status} = 'pending'`),
}));

export const friendships = pgTable("friendships", {
  userLowId: uuid("user_low_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userHighId: uuid("user_high_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceRequestId: uuid("source_request_id").unique().references(() => friendRequests.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userLowId, table.userHighId] }),
  orderedPair: check("friendships_ordered_pair", sql`${table.userLowId} < ${table.userHighId}`),
  highUserIdx: index("friendships_high_user_idx").on(table.userHighId, table.userLowId),
}));
