import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { chats, users } from "./schema";

export const chatInvites = pgTable(
  "chat_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at"),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex("chat_invites_token_hash_unique").on(t.tokenHash),
    chatIdx: index("chat_invites_chat_idx").on(t.chatId, t.createdAt),
  }),
);

export const chatRooms = pgTable("chat_rooms", {
  chatId: uuid("chat_id").primaryKey().references(() => chats.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().defaultRandom(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  accessMode: varchar("access_mode", { length: 20 }).notNull().default("open"),
  startedBy: uuid("started_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatRoomParticipants = pgTable(
  "chat_room_participants",
  {
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    micMuted: boolean("mic_muted").notNull().default(true),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.chatId, t.userId] }),
    heartbeatIdx: index("chat_room_participants_heartbeat_idx").on(t.chatId, t.lastSeenAt),
  }),
);

export const chatRoomInvites = pgTable(
  "chat_room_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    roomSessionId: uuid("room_session_id").notNull(),
    inviterId: uuid("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    respondedAt: timestamp("responded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    inviteeStatusIdx: index("chat_room_invites_invitee_status_idx").on(t.inviteeId, t.status, t.createdAt),
    sessionIdx: index("chat_room_invites_session_idx").on(t.chatId, t.roomSessionId, t.createdAt),
    sessionInviteeUnique: uniqueIndex("chat_room_invites_session_invitee_unique").on(
      t.chatId,
      t.roomSessionId,
      t.inviteeId,
    ),
  }),
);
