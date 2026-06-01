-- Voople: вставь в Supabase → SQL Editor → Run

CREATE TYPE "public"."acquired_via" AS ENUM('purchase', 'earned', 'gifted', 'seasonal_reward');
CREATE TYPE "public"."avatar_type" AS ENUM('constructor', 'photo');
CREATE TYPE "public"."banner_type" AS ENUM('color', 'pattern', 'animated');
CREATE TYPE "public"."chat_type" AS ENUM('direct', 'group');
CREATE TYPE "public"."item_type" AS ENUM('effect', 'ring', 'banner', 'nameplate', 'badge', 'reaction_pack');
CREATE TYPE "public"."notif_type" AS ENUM('like', 'card_reaction', 'follow', 'reply', 'repost', 'match', 'mystery_drop');
CREATE TYPE "public"."post_media_type" AS ENUM('image', 'gif', 'meme');
CREATE TYPE "public"."subscription_tier" AS ENUM('plus', 'pro');
CREATE TYPE "public"."track_source" AS ENUM('upload', 'chat', 'post');
CREATE TABLE "card_reactions" (
	"profile_user_id" uuid NOT NULL,
	"reactor_user_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_reactions_profile_user_id_reactor_user_id_emoji_pk" PRIMARY KEY("profile_user_id","reactor_user_id","emoji")
);

CREATE TABLE "chat_members" (
	"chat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_members_chat_id_user_id_pk" PRIMARY KEY("chat_id","user_id")
);

CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "chat_type" NOT NULL,
	"name" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);

CREATE TABLE "likes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);

CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"text" varchar(1000),
	"media_url" varchar(500),
	"shared_post_id" uuid,
	"shared_track_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);

CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notif_type" NOT NULL,
	"actor_id" uuid,
	"reference_id" uuid,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "playlist_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"artist" varchar(100) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"cover_url" varchar(500),
	"duration_seconds" integer,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_from" "track_source" DEFAULT 'upload' NOT NULL
);

CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"text" varchar(280),
	"state_snapshot" jsonb,
	"media_url" varchar(500),
	"media_type" "post_media_type",
	"is_repost" boolean DEFAULT false,
	"original_post_id" uuid,
	"repost_comment" varchar(280),
	"like_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "profile_customization" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"banner_type" "banner_type" DEFAULT 'color' NOT NULL,
	"banner_value" jsonb DEFAULT '{"color":"#1A0D2E"}'::jsonb NOT NULL,
	"avatar_type" "avatar_type" DEFAULT 'constructor' NOT NULL,
	"avatar_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"avatar_ring_id" varchar(100),
	"profile_effect_id" varchar(100),
	"nameplate_id" varchar(100),
	"nickname_color" varchar(20),
	"nickname_gradient" boolean DEFAULT false,
	"theme_primary" varchar(7) DEFAULT '#0A0A0F',
	"theme_accent" varchar(7) DEFAULT '#7B3AED',
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "profile_views" (
	"profile_user_id" uuid NOT NULL,
	"viewer_user_id" uuid NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_views_profile_user_id_viewer_user_id_pk" PRIMARY KEY("profile_user_id","viewer_user_id")
);

CREATE TABLE "shop_items" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"season_id" varchar(50),
	"type" "item_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_rub" integer NOT NULL,
	"apng_url" varchar(500),
	"preview_url" varchar(500),
	"is_limited" boolean DEFAULT false,
	"stock" integer,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"requires_subscription" "subscription_tier"
);

CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mood_value" integer,
	"thought" varchar(80),
	"track_title" varchar(100),
	"track_artist" varchar(100),
	"vibe_tag" varchar(30),
	"captured_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "subscriptions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tier" "subscription_tier" NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"payment_provider" varchar(50) NOT NULL,
	"external_id" varchar(200) NOT NULL
);

CREATE TABLE "user_anthem" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"track_id" uuid NOT NULL
);

CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" varchar(100) NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);

CREATE TABLE "user_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" varchar(100) NOT NULL,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	"acquired_via" "acquired_via" NOT NULL
);

CREATE TABLE "user_status" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"mood_value" integer,
	"thought" varchar(80),
	"track_title" varchar(100),
	"track_artist" varchar(100),
	"track_file_url" varchar(500),
	"watching_title" varchar(100),
	"watching_tmdb_id" varchar(20),
	"vibe_tag" varchar(30),
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(30) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"bio" varchar(100),
	"pinned_thought" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

ALTER TABLE "card_reactions" ADD CONSTRAINT "card_reactions_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "card_reactions" ADD CONSTRAINT "card_reactions_reactor_user_id_users_id_fk" FOREIGN KEY ("reactor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_post_id_posts_id_fk" FOREIGN KEY ("shared_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_track_id_playlist_tracks_id_fk" FOREIGN KEY ("shared_track_id") REFERENCES "public"."playlist_tracks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_customization" ADD CONSTRAINT "profile_customization_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_user_id_users_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_anthem" ADD CONSTRAINT "user_anthem_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_anthem" ADD CONSTRAINT "user_anthem_track_id_playlist_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."playlist_tracks"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."shop_items"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_status" ADD CONSTRAINT "user_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "follows_follower_idx" ON "follows" USING btree ("follower_id");
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id");
CREATE INDEX "messages_chat_idx" ON "messages" USING btree ("chat_id");
CREATE INDEX "messages_time_idx" ON "messages" USING btree ("created_at");
CREATE INDEX "notif_user_unread_idx" ON "notifications" USING btree ("user_id","read");
CREATE INDEX "playlist_user_idx" ON "playlist_tracks" USING btree ("user_id");
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
CREATE INDEX "status_history_user_idx" ON "status_history" USING btree ("user_id");
CREATE INDEX "status_history_time_idx" ON "status_history" USING btree ("captured_at");
CREATE INDEX "inventory_user_idx" ON "user_inventory" USING btree ("user_id");
CREATE INDEX "inventory_unique" ON "user_inventory" USING btree ("user_id","item_id");
CREATE INDEX "username_idx" ON "users" USING btree ("username");

-- Далее обязательно: drizzle/02-rls-policies.sql (см. docs/security.md)