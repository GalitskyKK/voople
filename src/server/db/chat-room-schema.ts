import { sql } from "drizzle-orm";
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

import { chats, messages, users } from "./schema";

export type GroupRoomKind = "lobby" | "temporary" | "pinned";
export type LiveSessionKind = "direct_call" | "group_room";
export type LiveSessionStatus = "connecting" | "active" | "grace" | "ended";

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

/**
 * Additive multi-room foundation. The legacy chatRooms tables above remain the
 * compatibility contract until the staged core-rework rollout is complete.
 */
export const groupRooms = pgTable(
  "group_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupChatId: uuid("group_chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 20 }).$type<GroupRoomKind>().notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    groupStateIdx: index("group_rooms_group_state_idx").on(t.groupChatId, t.archivedAt, t.createdAt),
    activeLobbyUnique: uniqueIndex("group_rooms_active_lobby_unique")
      .on(t.groupChatId)
      .where(sql`${t.kind} = 'lobby' AND ${t.archivedAt} IS NULL`),
  }),
);

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => groupRooms.id, { onDelete: "set null" }),
    providerSessionId: uuid("provider_session_id").notNull().defaultRandom(),
    kind: varchar("kind", { length: 20 }).$type<LiveSessionKind>().notNull(),
    status: varchar("status", { length: 20 }).$type<LiveSessionStatus>().notNull().default("connecting"),
    startedBy: uuid("started_by").notNull().references(() => users.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    emptySince: timestamp("empty_since"),
    endedAt: timestamp("ended_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    conversationStateIdx: index("live_sessions_conversation_state_idx")
      .on(t.conversationId, t.endedAt, t.startedAt),
    providerSessionUnique: uniqueIndex("live_sessions_provider_session_unique").on(t.providerSessionId),
    activeRoomUnique: uniqueIndex("live_sessions_active_room_unique")
      .on(t.roomId)
      .where(sql`${t.roomId} IS NOT NULL AND ${t.endedAt} IS NULL`),
    activeDirectUnique: uniqueIndex("live_sessions_active_direct_unique")
      .on(t.conversationId)
      .where(sql`${t.kind} = 'direct_call' AND ${t.endedAt} IS NULL`),
  }),
);

export const liveSessionParticipants = pgTable(
  "live_session_participants",
  {
    sessionId: uuid("session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    micMuted: boolean("mic_muted").notNull().default(true),
    cameraEnabled: boolean("camera_enabled").notNull().default(false),
    screenSharing: boolean("screen_sharing").notNull().default(false),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    leftAt: timestamp("left_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sessionId, t.userId] }),
    sessionPresenceIdx: index("live_session_participants_presence_idx")
      .on(t.sessionId, t.leftAt, t.lastSeenAt),
    oneActiveSessionPerUser: uniqueIndex("live_session_participants_active_user_unique")
      .on(t.userId)
      .where(sql`${t.leftAt} IS NULL`),
  }),
);

export const messageRoomContexts = pgTable(
  "message_room_contexts",
  {
    messageId: uuid("message_id").primaryKey().references(() => messages.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => groupRooms.id, { onDelete: "set null" }),
    liveSessionId: uuid("live_session_id").references(() => liveSessions.id, { onDelete: "set null" }),
    roomNameSnapshot: varchar("room_name_snapshot", { length: 80 }).notNull(),
    roomKindSnapshot: varchar("room_kind_snapshot", { length: 20 }).$type<GroupRoomKind>().notNull(),
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
  },
  (t) => ({
    roomHistoryIdx: index("message_room_contexts_room_history_idx").on(t.roomId, t.capturedAt),
    liveSessionIdx: index("message_room_contexts_live_session_idx").on(t.liveSessionId, t.capturedAt),
  }),
);
