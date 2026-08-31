import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn, boolean, date, index, integer, jsonb, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex, uuid, varchar,
} from "drizzle-orm/pg-core";

export const avatarTypeEnum = pgEnum("avatar_type", ["constructor", "photo"]);
export const bannerTypeEnum = pgEnum("banner_type", ["color", "pattern", "animated"]);
export const postMediaTypeEnum = pgEnum("post_media_type", ["image", "gif", "meme", "video", "circle"]);
export const itemTypeEnum = pgEnum("item_type", [
  "effect", "ring", "banner", "nameplate", "badge", "reaction_pack", "decoration",
  "feed_card", "app_theme", "profile_background"]);
export const chatTypeEnum = pgEnum("chat_type", ["direct", "group"]);
export const notifTypeEnum = pgEnum("notif_type", [
  "like", "card_reaction", "follow", "reply", "repost", "match",
  "mystery_drop", "profile_canvas_draw", "question", "room_invite",
]);
export const acquiredViaEnum = pgEnum("acquired_via", [
  "purchase", "earned", "gifted", "seasonal_reward",
]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["plus", "pro"]);
export const trackSourceEnum = pgEnum("track_source", ["upload", "chat", "post"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    bio: varchar("bio", { length: 100 }),
    pinnedThought: varchar("pinned_thought", { length: 100 }),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    showOnlineStatus: boolean("show_online_status").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    usernameIdx: index("username_idx").on(t.username),
  }),
);

export const profileCustomization = pgTable("profile_customization", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bannerType: bannerTypeEnum("banner_type").notNull().default("color"),
  bannerValue: jsonb("banner_value").notNull().default({ color: "#1A0D2E" }),
  avatarType: avatarTypeEnum("avatar_type").notNull().default("constructor"),
  avatarData: jsonb("avatar_data").notNull().default({}),
  avatarRingId: varchar("avatar_ring_id", { length: 100 }),
  /** @deprecated Эффекты профиля заменены рамкой (profile_frame_id). Данные не удаляются. */
  profileEffectId: varchar("profile_effect_id", { length: 100 }),
  profileBackgroundId: varchar("profile_background_id", { length: 100 }),
  /** Рамка вокруг всей карточки (баннер+основа). Id пресета из frames-registry. */
  profileFrameId: varchar("profile_frame_id", { length: 100 }),
  /** Кастомный цвет рамки (Voople+), HEX. Аналог nickname_color. */
  frameColor: varchar("frame_color", { length: 20 }),
  /** Режим основы карточки: mirror (дефолт) · theme (градиент) · plain (не дублировать баннер). */
  cardBaseMode: varchar("card_base_mode", { length: 20 }),
  nameplateId: varchar("nameplate_id", { length: 100 }),
  nicknameColor: varchar("nickname_color", { length: 20 }),
  nicknameGradient: boolean("nickname_gradient").default(false),
  nicknameFont: varchar("nickname_font", { length: 20 }).notNull().default("sans"),
  nicknameEffect: varchar("nickname_effect", { length: 20 }).notNull().default("plain"),
  themePrimary: varchar("theme_primary", { length: 7 }).default("#0A0A0F"),
  themeAccent: varchar("theme_accent", { length: 7 }).default("#7B3AED"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userStatus = pgTable("user_status", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  moodValue: integer("mood_value"),
  thought: varchar("thought", { length: 80 }),
  trackTitle: varchar("track_title", { length: 100 }),
  trackArtist: varchar("track_artist", { length: 100 }),
  trackId: uuid("track_id").references(() => playlistTracks.id, { onDelete: "set null" }),
  trackFileUrl: varchar("track_file_url", { length: 500 }),
  watchingTitle: varchar("watching_title", { length: 100 }),
  watchingTmdbId: varchar("watching_tmdb_id", { length: 20 }),
  vibeTag: varchar("vibe_tag", { length: 30 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const statusHistory = pgTable(
  "status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moodValue: integer("mood_value"),
    thought: varchar("thought", { length: 80 }),
    trackTitle: varchar("track_title", { length: 100 }),
    trackArtist: varchar("track_artist", { length: 100 }),
    vibeTag: varchar("vibe_tag", { length: 30 }),
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("status_history_user_idx").on(t.userId),
    capturedAtIdx: index("status_history_time_idx").on(t.capturedAt),
  }),
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 280 }),
    stateSnapshot: jsonb("state_snapshot"),
    mediaUrl: varchar("media_url", { length: 500 }),
    mediaType: postMediaTypeEnum("media_type"),
    isRepost: boolean("is_repost").default(false),
    originalPostId: uuid("original_post_id").references((): AnyPgColumn => posts.id, {
      onDelete: "set null",
    }),
    repostComment: varchar("repost_comment", { length: 280 }),
    likeCount: integer("like_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    repostCount: integer("repost_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    authorIdx: index("posts_author_idx").on(t.authorId),
    createdAtIdx: index("posts_created_at_idx").on(t.createdAt),
    originalPostIdx: index("posts_original_post_idx").on(t.originalPostId),
    plainRepostUnique: uniqueIndex("posts_plain_repost_unique")
      .on(t.authorId, t.originalPostId)
      .where(sql`${t.isRepost} = true AND ${t.repostComment} IS NULL AND ${t.originalPostId} IS NOT NULL`),
  }),
);

export const profilePinnedPosts = pgTable("profile_pinned_posts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 280 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    postTimeIdx: index("post_comments_post_time_idx").on(t.postId, t.createdAt),
    authorTimeIdx: index("post_comments_author_time_idx").on(t.authorId, t.createdAt),
  }),
);

export const hashtags = pgTable("hashtags", {
  name: varchar("name", { length: 64 }).primaryKey(),
  postCount: integer("post_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postHashtags = pgTable(
  "post_hashtags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    hashtagName: varchar("hashtag_name", { length: 64 })
      .notNull()
      .references(() => hashtags.name, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.hashtagName] }),
    hashtagIdx: index("post_hashtags_hashtag_idx").on(t.hashtagName, t.createdAt),
  }),
);

export const likes = pgTable(
  "likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.userId] }),
  }),
);

export const cardReactions = pgTable(
  "card_reactions",
  {
    profileUserId: uuid("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reactorUserId: uuid("reactor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.profileUserId, t.reactorUserId, t.emoji] }),
  }),
);

/** Штрихи интерактивного холста на обратной стороне карточки профиля */
export const profileCanvasStrokes = pgTable(
  "profile_canvas_strokes",
  {
    id: uuid("id").primaryKey(),
    profileUserId: uuid("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    color: varchar("color", { length: 20 }).notNull(),
    size: integer("size").notNull(),
    points: jsonb("points").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    profileTimeIdx: index("profile_canvas_strokes_profile_time_idx").on(
      t.profileUserId,
      t.createdAt,
    ),
    authorIdx: index("profile_canvas_strokes_author_idx").on(t.authorId),
  }),
);

/**
 * Анонимные вопросы профилю. `askerId` хранится для анти-абьюза, но никогда не
 * раскрывается владельцу (анонимность обеспечивается на сервере).
 */
export const profileQuestions = pgTable(
  "profile_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileUserId: uuid("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    askerId: uuid("asker_id").references(() => users.id, { onDelete: "set null" }),
    questionText: text("question_text").notNull(),
    answerText: text("answer_text"),
    answeredAt: timestamp("answered_at"),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    inboxIdx: index("profile_questions_inbox_idx").on(t.profileUserId, t.createdAt),
    answeredIdx: index("profile_questions_answered_idx").on(t.profileUserId, t.answeredAt),
  }),
);

/** Эмодзи-реакции на отвеченные вопросы. */
export const questionReactions = pgTable(
  "question_reactions",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => profileQuestions.id, { onDelete: "cascade" }),
    reactorUserId: uuid("reactor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.questionId, t.reactorUserId, t.emoji] }),
    questionIdx: index("question_reactions_question_idx").on(t.questionId),
  }),
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followingId] }),
    followerIdx: index("follows_follower_idx").on(t.followerId),
    followingIdx: index("follows_following_idx").on(t.followingId),
  }),
);

export const postViews = pgTable(
  "post_views",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    viewerUserId: uuid("viewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.viewerUserId] }),
    viewerIdx: index("post_views_viewer_idx").on(t.viewerUserId),
  }),
);

export const profileViews = pgTable(
  "profile_views",
  {
    profileUserId: uuid("profile_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewerUserId: uuid("viewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.profileUserId, t.viewerUserId] }),
  }),
);

export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 100 }).notNull(),
    artist: varchar("artist", { length: 100 }).notNull(),
    fileUrl: varchar("file_url", { length: 500 }).notNull(),
    coverUrl: varchar("cover_url", { length: 500 }),
    durationSeconds: integer("duration_seconds"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    addedFrom: trackSourceEnum("added_from").notNull().default("upload"),
  },
  (t) => ({
    userIdx: index("playlist_user_idx").on(t.userId),
  }),
);

export const userAnthem = pgTable("user_anthem", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  trackId: uuid("track_id")
    .notNull()
    .references(() => playlistTracks.id),
});

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: chatTypeEnum("type").notNull(),
  name: varchar("name", { length: 50 }),
  parentChatId: uuid("parent_chat_id").references(
    (): AnyPgColumn => chats.id,
    { onDelete: "cascade" },
  ),
  topicsEnabled: boolean("topics_enabled").notNull().default(false),
  topicsLayout: varchar("topics_layout", { length: 20 }).notNull().default("list"),
  topicIcon: varchar("topic_icon", { length: 16 }),
  groupVisibility: varchar("group_visibility", { length: 20 }).notNull().default("private"),
  joinPolicy: varchar("join_policy", { length: 20 }).notNull().default("invite_only"),
  sectionAccessMode: varchar("section_access_mode", { length: 20 }).notNull().default("inherit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  parentIdx: index("chats_parent_chat_idx").on(t.parentChatId, t.createdAt),
}));
export const directChatPairs = pgTable(
  "direct_chat_pairs",
  {
    chatId: uuid("chat_id")
      .primaryKey()
      .references(() => chats.id, { onDelete: "cascade" }),
    userLowId: uuid("user_low_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userHighId: uuid("user_high_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex("direct_chat_pairs_users_unique").on(t.userLowId, t.userHighId),
  }),
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.chatId, t.userId] }),
  }),
);

export const chatSectionMembers = pgTable(
  "chat_section_members",
  {
    chatId: uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.chatId, t.userId] }),
    userIdx: index("chat_section_members_user_idx").on(t.userId, t.chatId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: varchar("text", { length: 1000 }),
    content: jsonb("content"),
    mediaUrl: varchar("media_url", { length: 500 }),
    mediaTitle: varchar("media_title", { length: 100 }),
    mediaArtist: varchar("media_artist", { length: 100 }),
    sharedPostId: uuid("shared_post_id").references(() => posts.id, { onDelete: "set null" }),
    sharedTrackId: uuid("shared_track_id").references(() => playlistTracks.id),
    replyToMessageId: uuid("reply_to_message_id").references((): AnyPgColumn => messages.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (t) => ({
    chatIdx: index("messages_chat_idx").on(t.chatId),
    createdAtIdx: index("messages_time_idx").on(t.createdAt),
    chatTimeIdx: index("messages_chat_time_idx").on(t.chatId, t.createdAt),
  }),
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }),
    emojiId: uuid("emoji_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    nativeUnique: uniqueIndex("message_reactions_native_unique").on(t.messageId, t.userId, t.emoji),
    customUnique: uniqueIndex("message_reactions_custom_unique").on(t.messageId, t.userId, t.emojiId),
    chatIdx: index("message_reactions_chat_idx").on(t.chatId),
    messageIdx: index("message_reactions_message_idx").on(t.messageId),
  }),
);

export const shopItems = pgTable("shop_items", {
  id: varchar("id", { length: 100 }).primaryKey(),
  seasonId: varchar("season_id", { length: 50 }),
  type: itemTypeEnum("type").notNull(),
  kind: varchar("kind", { length: 50 }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceRub: integer("price_rub").notNull().default(0),
  priceCoins: integer("price_coins").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  previewUrl: varchar("preview_url", { length: 500 }),
  sortOrder: integer("sort_order").notNull().default(0),
  assetFolder: varchar("asset_folder", { length: 100 }),
  assetId: varchar("asset_id", { length: 200 }),
  equipSlot: varchar("equip_slot", { length: 50 }),
  equipValue: varchar("equip_value", { length: 200 }),
  apngUrl: varchar("apng_url", { length: 500 }),
  isLimited: boolean("is_limited").default(false),
  stock: integer("stock"),
  soldCount: integer("sold_count").notNull().default(0),
  requiresSubscription: subscriptionTierEnum("requires_subscription"),
});

export const userInventory = pgTable(
  "user_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: varchar("item_id", { length: 100 })
      .notNull()
      .references(() => shopItems.id),
    acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
    acquiredVia: acquiredViaEnum("acquired_via").notNull(),
  },
  (t) => ({
    userIdx: index("inventory_user_idx").on(t.userId),
    uniqueItem: uniqueIndex("inventory_unique").on(t.userId, t.itemId),
  }),
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: varchar("badge_id", { length: 100 }).notNull(),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.badgeId] }),
  }),
);

export const subscriptions = pgTable("subscriptions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tier: subscriptionTierEnum("tier").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  paymentProvider: varchar("payment_provider", { length: 50 }).notNull(),
  externalId: varchar("external_id", { length: 200 }).notNull(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notifTypeEnum("type").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "cascade" }),
    referenceId: uuid("reference_id"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userUnreadIdx: index("notif_user_unread_idx").on(t.userId, t.read),
  }),
);

/** Ежедневный стрик активности (ретеншн). Одна строка на пользователя. */
export const userStreaks = pgTable("user_streaks", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export { clientTelemetryEvents } from "./analytics-schema";
export const usersRelations = relations(users, ({ one, many }) => ({
  customization: one(profileCustomization, {
    fields: [users.id],
    references: [profileCustomization.userId],
  }),
  status: one(userStatus, {
    fields: [users.id],
    references: [userStatus.userId],
  }),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  posts: many(posts),
  statusHistory: many(statusHistory),
}));

export const profileCustomizationRelations = relations(profileCustomization, ({ one }) => ({
  user: one(users, {
    fields: [profileCustomization.userId],
    references: [users.id],
  }),
}));

export const userStatusRelations = relations(userStatus, ({ one }) => ({
  user: one(users, {
    fields: [userStatus.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  originalPost: one(posts, {
    fields: [posts.originalPostId],
    references: [posts.id],
    relationName: "reposts",
  }),
  likes: many(likes),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));
