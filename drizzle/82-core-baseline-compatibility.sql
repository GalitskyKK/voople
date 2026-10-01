-- Synthesized core compatibility foundation; never replay historical 0000..37.
-- Fresh: PRE-38. Existing: validate stable contracts and legitimate tracked evolution.
-- Apply transactionally through the runner, AFTER 45 and BEFORE 38.
-- Platform auth/roles are external. No commerce objects or user-data transformations.
-- Evidence: core attestation captured 2026-10-01, base 10dc5b5902b5804970b6fd570ab364392fffa073.
-- Evidence canonical-LF SHA-256: ecb70cb2e4ad566d6895ef30b7ef5d0e5825973530fc8c5def918c8eed3fc875
DO $capture$ BEGIN
  PERFORM set_config('voople.core_baseline_created', (SELECT coalesce(jsonb_agg(name), '[]'::jsonb)::text FROM unnest(ARRAY['users','chats','posts','playlist_tracks','chat_members','messages','message_reactions','chat_invites','chat_audit_log','direct_chat_pairs','follows','chat_rooms','chat_room_participants','chat_section_members','notifications']) name WHERE to_regclass('public.' || name) IS NULL), true);
END $capture$;
--> statement-breakpoint
DO $platform$
BEGIN
  IF to_regclass('public.app_schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Core baseline requires migration 45 first';
  END IF;
  IF to_regclass('auth.users') IS NULL OR to_regprocedure('auth.uid()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'auth.users'::regclass AND attname = 'id' AND atttypid = 'uuid'::regtype)
    OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'auth.uid()'::regprocedure AND prorettype = 'uuid'::regtype)
    OR (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')) <> 3 THEN
    RAISE EXCEPTION 'Core baseline requires external Supabase auth.users(id uuid), auth.uid() and platform roles';
  END IF;
END $platform$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regtype('public.chat_type') IS NULL THEN
    CREATE TYPE public.chat_type AS ENUM ('direct', 'group');
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regtype('public.notif_type') IS NULL THEN
    CREATE TYPE public.notif_type AS ENUM ('like', 'card_reaction', 'follow', 'reply', 'repost', 'match', 'mystery_drop', 'profile_canvas_draw', 'question');
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regtype('public.post_media_type') IS NULL THEN
    CREATE TYPE public.post_media_type AS ENUM ('image', 'gif', 'meme', 'video', 'circle');
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regtype('public.track_source') IS NULL THEN
    CREATE TYPE public.track_source AS ENUM ('upload', 'chat', 'post');
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.users') IS NULL THEN
    CREATE TABLE public.users (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      username character varying(30) NOT NULL,
      display_name character varying(50) NOT NULL,
      bio character varying(100),
      pinned_thought character varying(100),
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      updated_at timestamp without time zone DEFAULT now() NOT NULL,
      last_seen_at timestamp without time zone DEFAULT now() NOT NULL,
      show_online_status boolean DEFAULT true NOT NULL,
      CONSTRAINT users_pkey PRIMARY KEY (id),
      CONSTRAINT users_username_unique UNIQUE (username)
    );
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.users REPLICA IDENTITY DEFAULT;
    CREATE INDEX username_idx ON public.users USING btree (username);
    CREATE INDEX users_display_name_search_idx ON public.users USING btree (lower((display_name)::text));
    CREATE INDEX users_username_search_idx ON public.users USING btree (lower((username)::text));
    REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chats') IS NULL THEN
    CREATE TABLE public.chats (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      type public.chat_type NOT NULL,
      name character varying(50),
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      parent_chat_id uuid,
      topics_enabled boolean DEFAULT false NOT NULL,
      topics_layout character varying(20) DEFAULT 'list'::character varying NOT NULL,
      topic_icon character varying(16),
      group_visibility character varying(20) DEFAULT 'private'::character varying NOT NULL,
      section_access_mode character varying(20) DEFAULT 'inherit'::character varying NOT NULL,
      CONSTRAINT chats_group_visibility_check CHECK (group_visibility::text = ANY (ARRAY['private'::character varying, 'public'::character varying]::text[])),
      CONSTRAINT chats_parent_chat_id_fkey FOREIGN KEY (parent_chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chats_pkey PRIMARY KEY (id),
      CONSTRAINT chats_section_access_mode_check CHECK (section_access_mode::text = ANY (ARRAY['inherit'::character varying, 'restricted'::character varying]::text[])),
      CONSTRAINT chats_subchat_type_check CHECK (parent_chat_id IS NULL OR type = 'group'::public.chat_type),
      CONSTRAINT chats_topics_layout_check CHECK (topics_layout::text = ANY (ARRAY['tabs'::character varying, 'list'::character varying]::text[]))
    );
    ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chats REPLICA IDENTITY DEFAULT;
    CREATE INDEX chats_parent_chat_idx ON public.chats USING btree (parent_chat_id, created_at);
    REVOKE ALL ON TABLE public.chats FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chats TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chats TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.posts') IS NULL THEN
    CREATE TABLE public.posts (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      author_id uuid NOT NULL,
      text character varying(280),
      state_snapshot jsonb,
      media_url character varying(500),
      media_type public.post_media_type,
      is_repost boolean DEFAULT false,
      original_post_id uuid,
      repost_comment character varying(280),
      like_count integer DEFAULT 0 NOT NULL,
      reply_count integer DEFAULT 0 NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      view_count integer DEFAULT 0 NOT NULL,
      repost_count integer DEFAULT 0 NOT NULL,
      CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT posts_original_post_id_posts_id_fk FOREIGN KEY (original_post_id) REFERENCES public.posts(id) ON DELETE SET NULL,
      CONSTRAINT posts_pkey PRIMARY KEY (id)
    );
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.posts REPLICA IDENTITY FULL;
    -- Historical 11 owns these indexes. Do not move/recreate an installed extension.
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
      CREATE EXTENSION pg_trgm WITH SCHEMA public;
    END IF;
    CREATE INDEX posts_author_idx ON public.posts USING btree (author_id);
    CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at);
    CREATE INDEX posts_original_post_idx ON public.posts USING btree (original_post_id);
    CREATE UNIQUE INDEX posts_plain_repost_unique ON public.posts USING btree (author_id, original_post_id) WHERE ((is_repost = true) AND (repost_comment IS NULL) AND (original_post_id IS NOT NULL));
    EXECUTE format('CREATE INDEX posts_repost_comment_trgm_idx ON public.posts USING gin (COALESCE(repost_comment, ''''::character varying) %I.gin_trgm_ops)',
      (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm'));
    EXECUTE format('CREATE INDEX posts_text_trgm_idx ON public.posts USING gin (COALESCE(text, ''''::character varying) %I.gin_trgm_ops)',
      (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm'));
    REVOKE ALL ON TABLE public.posts FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.playlist_tracks') IS NULL THEN
    CREATE TABLE public.playlist_tracks (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid NOT NULL,
      title character varying(100) NOT NULL,
      artist character varying(100) NOT NULL,
      file_url character varying(500) NOT NULL,
      cover_url character varying(500),
      duration_seconds integer,
      added_at timestamp without time zone DEFAULT now() NOT NULL,
      added_from public.track_source DEFAULT 'upload'::public.track_source NOT NULL,
      CONSTRAINT playlist_tracks_pkey PRIMARY KEY (id),
      CONSTRAINT playlist_tracks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.playlist_tracks REPLICA IDENTITY DEFAULT;
    CREATE INDEX playlist_user_idx ON public.playlist_tracks USING btree (user_id);
    REVOKE ALL ON TABLE public.playlist_tracks FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playlist_tracks TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playlist_tracks TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chat_members') IS NULL THEN
    CREATE TABLE public.chat_members (
      chat_id uuid NOT NULL,
      user_id uuid NOT NULL,
      joined_at timestamp without time zone DEFAULT now() NOT NULL,
      role character varying(20) DEFAULT 'member'::character varying NOT NULL,
      CONSTRAINT chat_members_chat_id_chats_id_fk FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chat_members_chat_id_user_id_pk PRIMARY KEY (chat_id, user_id),
      CONSTRAINT chat_members_role_check CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying]::text[])),
      CONSTRAINT chat_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_members REPLICA IDENTITY DEFAULT;
    REVOKE ALL ON TABLE public.chat_members FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_members TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_members TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.messages') IS NULL THEN
    CREATE TABLE public.messages (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      chat_id uuid NOT NULL,
      sender_id uuid NOT NULL,
      text character varying(1000),
      media_url character varying(500),
      shared_post_id uuid,
      shared_track_id uuid,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      read_at timestamp without time zone,
      reply_to_message_id uuid,
      media_title character varying(100),
      media_artist character varying(100),
      CONSTRAINT messages_chat_id_chats_id_fk FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT messages_pkey PRIMARY KEY (id),
      CONSTRAINT messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id) ON DELETE SET NULL,
      CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT messages_shared_post_id_posts_id_fk FOREIGN KEY (shared_post_id) REFERENCES public.posts(id) ON DELETE SET NULL,
      CONSTRAINT messages_shared_track_id_playlist_tracks_id_fk FOREIGN KEY (shared_track_id) REFERENCES public.playlist_tracks(id) ON DELETE SET NULL
    );
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.messages REPLICA IDENTITY FULL;
    CREATE INDEX messages_chat_idx ON public.messages USING btree (chat_id);
    CREATE INDEX messages_chat_time_idx ON public.messages USING btree (chat_id, created_at);
    CREATE INDEX messages_reply_to_idx ON public.messages USING btree (reply_to_message_id) WHERE (reply_to_message_id IS NOT NULL);
    CREATE INDEX messages_time_idx ON public.messages USING btree (created_at);
    REVOKE ALL ON TABLE public.messages FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.message_reactions') IS NULL THEN
    CREATE TABLE public.message_reactions (
      message_id uuid NOT NULL,
      chat_id uuid NOT NULL,
      user_id uuid NOT NULL,
      emoji character varying(10) NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT message_reactions_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
      CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id, emoji)
    );
    ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.message_reactions REPLICA IDENTITY DEFAULT;
    CREATE INDEX message_reactions_chat_idx ON public.message_reactions USING btree (chat_id);
    CREATE INDEX message_reactions_message_idx ON public.message_reactions USING btree (message_id);
    REVOKE ALL ON TABLE public.message_reactions FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_reactions TO service_role;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chat_invites') IS NULL THEN
    CREATE TABLE public.chat_invites (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      chat_id uuid NOT NULL,
      created_by uuid NOT NULL,
      token_hash character varying(64) NOT NULL,
      expires_at timestamp without time zone NOT NULL,
      max_uses integer DEFAULT 20 NOT NULL,
      use_count integer DEFAULT 0 NOT NULL,
      revoked_at timestamp without time zone,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT chat_invites_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chat_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT chat_invites_max_uses_check CHECK (max_uses >= 1 AND max_uses <= 100),
      CONSTRAINT chat_invites_pkey PRIMARY KEY (id),
      CONSTRAINT chat_invites_token_hash_unique UNIQUE (token_hash),
      CONSTRAINT chat_invites_use_count_check CHECK (use_count >= 0)
    );
    ALTER TABLE public.chat_invites ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_invites REPLICA IDENTITY DEFAULT;
    CREATE INDEX chat_invites_chat_idx ON public.chat_invites USING btree (chat_id, created_at DESC);
    REVOKE ALL ON TABLE public.chat_invites FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_invites TO service_role;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chat_audit_log') IS NULL THEN
    CREATE TABLE public.chat_audit_log (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      chat_id uuid NOT NULL,
      actor_id uuid,
      target_user_id uuid,
      action character varying(40) NOT NULL,
      details jsonb DEFAULT '{}'::jsonb NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT chat_audit_log_action_check CHECK (action::text = ANY (ARRAY['member_added'::character varying, 'member_removed'::character varying, 'member_left'::character varying, 'role_changed'::character varying, 'ownership_transferred'::character varying, 'topics_changed'::character varying, 'visibility_changed'::character varying]::text[])),
      CONSTRAINT chat_audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL,
      CONSTRAINT chat_audit_log_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chat_audit_log_pkey PRIMARY KEY (id),
      CONSTRAINT chat_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL
    );
    ALTER TABLE public.chat_audit_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_audit_log REPLICA IDENTITY DEFAULT;
    CREATE INDEX chat_audit_log_chat_created_idx ON public.chat_audit_log USING btree (chat_id, created_at DESC);
    REVOKE ALL ON TABLE public.chat_audit_log FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT ON TABLE public.chat_audit_log TO service_role;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.direct_chat_pairs') IS NULL THEN
    CREATE TABLE public.direct_chat_pairs (
      chat_id uuid NOT NULL,
      user_low_id uuid NOT NULL,
      user_high_id uuid NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT direct_chat_pairs_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT direct_chat_pairs_order_check CHECK (user_low_id::text < user_high_id::text),
      CONSTRAINT direct_chat_pairs_pkey PRIMARY KEY (chat_id),
      CONSTRAINT direct_chat_pairs_user_high_id_fkey FOREIGN KEY (user_high_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT direct_chat_pairs_user_low_id_fkey FOREIGN KEY (user_low_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT direct_chat_pairs_users_unique UNIQUE (user_low_id, user_high_id)
    );
    ALTER TABLE public.direct_chat_pairs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.direct_chat_pairs REPLICA IDENTITY DEFAULT;
    REVOKE ALL ON TABLE public.direct_chat_pairs FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.direct_chat_pairs TO service_role;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.follows') IS NULL THEN
    CREATE TABLE public.follows (
      follower_id uuid NOT NULL,
      following_id uuid NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT follows_follower_id_following_id_pk PRIMARY KEY (follower_id, following_id),
      CONSTRAINT follows_follower_id_users_id_fk FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT follows_following_id_users_id_fk FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.follows REPLICA IDENTITY DEFAULT;
    CREATE INDEX follows_follower_idx ON public.follows USING btree (follower_id);
    CREATE INDEX follows_following_idx ON public.follows USING btree (following_id);
    REVOKE ALL ON TABLE public.follows FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follows TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follows TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chat_rooms') IS NULL THEN
    CREATE TABLE public.chat_rooms (
      chat_id uuid NOT NULL,
      status character varying(20) DEFAULT 'active'::character varying NOT NULL,
      access_mode character varying(20) DEFAULT 'open'::character varying NOT NULL,
      started_by uuid NOT NULL,
      started_at timestamp without time zone DEFAULT now() NOT NULL,
      ended_at timestamp without time zone,
      updated_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT chat_rooms_access_mode_check CHECK (access_mode::text = ANY (ARRAY['open'::character varying, 'locked'::character varying]::text[])),
      CONSTRAINT chat_rooms_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chat_rooms_pkey PRIMARY KEY (chat_id),
      CONSTRAINT chat_rooms_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT chat_rooms_status_check CHECK (status::text = ANY (ARRAY['ringing'::character varying, 'active'::character varying, 'ended'::character varying, 'declined'::character varying, 'cancelled'::character varying, 'missed'::character varying]::text[]))
    );
    ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_rooms REPLICA IDENTITY DEFAULT;
    REVOKE ALL ON TABLE public.chat_rooms FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_rooms TO service_role;
    GRANT SELECT ON TABLE public.chat_rooms TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chat_room_participants') IS NULL THEN
    CREATE TABLE public.chat_room_participants (
      chat_id uuid NOT NULL,
      user_id uuid NOT NULL,
      mic_muted boolean DEFAULT true NOT NULL,
      joined_at timestamp without time zone DEFAULT now() NOT NULL,
      last_seen_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT chat_room_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chat_room_participants_pk PRIMARY KEY (chat_id, user_id),
      CONSTRAINT chat_room_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_room_participants REPLICA IDENTITY DEFAULT;
    CREATE INDEX chat_room_participants_heartbeat_idx ON public.chat_room_participants USING btree (chat_id, last_seen_at DESC);
    REVOKE ALL ON TABLE public.chat_room_participants FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_room_participants TO service_role;
    GRANT SELECT ON TABLE public.chat_room_participants TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.chat_section_members') IS NULL THEN
    CREATE TABLE public.chat_section_members (
      chat_id uuid NOT NULL,
      user_id uuid NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT chat_section_members_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT chat_section_members_pkey PRIMARY KEY (chat_id, user_id),
      CONSTRAINT chat_section_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.chat_section_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.chat_section_members REPLICA IDENTITY DEFAULT;
    CREATE INDEX chat_section_members_user_idx ON public.chat_section_members USING btree (user_id, chat_id);
    REVOKE ALL ON TABLE public.chat_section_members FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_section_members TO service_role;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    CREATE TABLE public.notifications (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid NOT NULL,
      type public.notif_type NOT NULL,
      actor_id uuid,
      reference_id uuid,
      read boolean DEFAULT false NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT notifications_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE,
      CONSTRAINT notifications_pkey PRIMARY KEY (id),
      CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notifications REPLICA IDENTITY FULL;
    CREATE INDEX notif_user_unread_idx ON public.notifications USING btree (user_id, read);
    REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO anon, authenticated;
  END IF;
END $create$;
--> statement-breakpoint
DO $create$ BEGIN
  IF to_regprocedure('public.is_chat_member(uuid)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_chat_member') THEN
      RAISE EXCEPTION 'Core baseline incompatible is_chat_member signature';
    END IF;
    EXECUTE 'CREATE FUNCTION public.is_chat_member(p_chat_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.chats requested_chat
    JOIN public.chat_members member
      ON member.chat_id = COALESCE(requested_chat.parent_chat_id, requested_chat.id)
    WHERE requested_chat.id = p_chat_id
      AND member.user_id = auth.uid()
  );
$function$
';
    REVOKE ALL ON FUNCTION public.is_chat_member(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO anon, authenticated, service_role;
  END IF;
END $create$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'users' THEN
    CREATE POLICY users_insert_own ON public.users AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = id));
    CREATE POLICY users_select_public ON public.users AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
    CREATE POLICY users_update_own ON public.users AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'chats' THEN
    CREATE POLICY chats_insert_authenticated ON public.chats AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY chats_select_member ON public.chats AS PERMISSIVE FOR SELECT TO PUBLIC USING (public.is_chat_member(id));
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'posts' THEN
    CREATE POLICY posts_delete_own ON public.posts AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = author_id));
    CREATE POLICY posts_insert_own ON public.posts AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = author_id));
    CREATE POLICY posts_select_public ON public.posts AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
    CREATE POLICY posts_update_own ON public.posts AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = author_id)) WITH CHECK ((auth.uid() = author_id));
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'playlist_tracks' THEN
    CREATE POLICY playlist_tracks_delete_own ON public.playlist_tracks AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = user_id));
    CREATE POLICY playlist_tracks_insert_own ON public.playlist_tracks AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));
    CREATE POLICY playlist_tracks_select_public ON public.playlist_tracks AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
    CREATE POLICY playlist_tracks_update_own ON public.playlist_tracks AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'chat_members' THEN
    CREATE POLICY chat_members_delete_self ON public.chat_members AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = user_id));
    CREATE POLICY chat_members_select_member ON public.chat_members AS PERMISSIVE FOR SELECT TO PUBLIC USING (public.is_chat_member(chat_id));
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'messages' THEN
    CREATE POLICY messages_insert_member ON public.messages AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((auth.uid() = sender_id) AND public.is_chat_member(chat_id)));
    CREATE POLICY messages_select_member ON public.messages AS PERMISSIVE FOR SELECT TO PUBLIC USING (public.is_chat_member(chat_id));
    CREATE POLICY messages_update_sender ON public.messages AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = sender_id)) WITH CHECK ((auth.uid() = sender_id));
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'message_reactions' THEN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'follows' THEN
    CREATE POLICY follows_delete_own ON public.follows AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = follower_id));
    CREATE POLICY follows_insert_own ON public.follows AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = follower_id));
    CREATE POLICY follows_select_public ON public.follows AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'chat_rooms' THEN
    CREATE POLICY chat_rooms_select_member ON public.chat_rooms AS PERMISSIVE FOR SELECT TO PUBLIC USING (public.is_chat_member(chat_id));
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'chat_room_participants' THEN
    CREATE POLICY chat_room_participants_select_member ON public.chat_room_participants AS PERMISSIVE FOR SELECT TO PUBLIC USING (public.is_chat_member(chat_id));
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_participants;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
DO $security$ BEGIN
  IF current_setting('voople.core_baseline_created')::jsonb ? 'notifications' THEN
    CREATE POLICY notifications_select_own ON public.notifications AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
    CREATE POLICY notifications_update_own ON public.notifications AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $security$;
--> statement-breakpoint
-- BEGIN CORE BASELINE READ-ONLY VALIDATION
DO $validate$
DECLARE
  require_current boolean := false;
  contract jsonb := $contract${
  "enums": [
    [
      "chat_type",
      ["direct","group"]
    ],
    [
      "notif_type",
      ["like","card_reaction","follow","reply","repost","match","mystery_drop","profile_canvas_draw","question","room_invite","friend_request","friend_accept"]
    ],
    [
      "post_media_type",
      ["image","gif","meme","video","circle"]
    ],
    [
      "track_source",
      ["upload","chat","post"]
    ]
  ],
  "tables": [
    {
      "name": "users",
      "replica": "d",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["username","character varying(30)",false,null,false],
        ["display_name","character varying(50)",false,null,false],
        ["bio","character varying(100)",true,null,false],
        ["pinned_thought","character varying(100)",true,null,false],
        ["created_at","timestamp without time zone",false,"now()",false],
        ["updated_at","timestamp without time zone",false,"now()",false],
        ["last_seen_at","timestamp without time zone",false,"now()",false],
        ["show_online_status","boolean",false,"true",false]
      ],
      "constraints": [
        ["users_pkey","PRIMARY KEY (id)","p"],
        ["users_username_unique","UNIQUE (username)","u"]
      ],
      "indexes": [
        ["username_idx","CREATE INDEX username_idx ON public.users USING btree (username)"],
        ["users_display_name_search_idx","CREATE INDEX users_display_name_search_idx ON public.users USING btree (lower((display_name)::text))"],
        ["users_username_search_idx","CREATE INDEX users_username_search_idx ON public.users USING btree (lower((username)::text))"]
      ],
      "policies": [
        {
          "name": "users_insert_own",
          "command": "a",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": null,
          "check_expression": "(auth.uid() = id)"
        },
        {
          "name": "users_select_public",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "true",
          "check_expression": null
        },
        {
          "name": "users_update_own",
          "command": "w",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = id)",
          "check_expression": "(auth.uid() = id)"
        }
      ]
    },
    {
      "name": "chats",
      "replica": "d",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["type","public.chat_type",false,null,false],
        ["name","character varying(50)",true,null,false],
        ["created_at","timestamp without time zone",false,"now()",false],
        ["parent_chat_id","uuid",true,null,false],
        ["topics_enabled","boolean",false,"false",false],
        ["topics_layout","character varying(20)",false,"'list'::character varying",false],
        ["topic_icon","character varying(16)",true,null,false],
        ["group_visibility","character varying(20)",false,"'private'::character varying",false],
        ["section_access_mode","character varying(20)",false,"'inherit'::character varying",false],
        ["join_policy","character varying(20)",false,"'invite_only'::character varying",true]
      ],
      "constraints": [
        ["chats_group_visibility_check","CHECK (group_visibility::text = ANY (ARRAY['private'::character varying, 'unlisted'::character varying, 'public'::character varying]::text[]))","c"],
        ["chats_join_policy_check","CHECK (join_policy::text = ANY (ARRAY['open'::character varying, 'request'::character varying, 'invite_only'::character varying]::text[]))","c"],
        ["chats_parent_chat_id_fkey","FOREIGN KEY (parent_chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chats_pkey","PRIMARY KEY (id)","p"],
        ["chats_section_access_mode_check","CHECK (section_access_mode::text = ANY (ARRAY['inherit'::character varying, 'restricted'::character varying]::text[]))","c"],
        ["chats_subchat_type_check","CHECK (parent_chat_id IS NULL OR type = 'group'::public.chat_type)","c"],
        ["chats_topics_layout_check","CHECK (topics_layout::text = ANY (ARRAY['tabs'::character varying, 'list'::character varying]::text[]))","c"]
      ],
      "indexes": [
        ["chats_parent_chat_idx","CREATE INDEX chats_parent_chat_idx ON public.chats USING btree (parent_chat_id, created_at)"]
      ],
      "policies": [
        {
          "name": "chats_insert_authenticated",
          "command": "a",
          "permissive": true,
          "roles": ["authenticated"],
          "using_expression": null,
          "check_expression": "true"
        },
        {
          "name": "chats_select_member",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "public.is_chat_member(id)",
          "check_expression": null
        }
      ],
      "fresh": {
        "constraints": [
          ["chats_group_visibility_check","CHECK (group_visibility::text = ANY (ARRAY['private'::character varying, 'public'::character varying]::text[]))","c"],
          ["chats_parent_chat_id_fkey","FOREIGN KEY (parent_chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
          ["chats_pkey","PRIMARY KEY (id)","p"],
          ["chats_section_access_mode_check","CHECK (section_access_mode::text = ANY (ARRAY['inherit'::character varying, 'restricted'::character varying]::text[]))","c"],
          ["chats_subchat_type_check","CHECK (parent_chat_id IS NULL OR type = 'group'::public.chat_type)","c"],
          ["chats_topics_layout_check","CHECK (topics_layout::text = ANY (ARRAY['tabs'::character varying, 'list'::character varying]::text[]))","c"]
        ],
        "indexes": [
          ["chats_parent_chat_idx","CREATE INDEX chats_parent_chat_idx ON public.chats USING btree (parent_chat_id, created_at)"]
        ]
      }
    },
    {
      "name": "posts",
      "replica": "f",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["author_id","uuid",false,null,false],
        ["text","character varying(280)",true,null,false],
        ["state_snapshot","jsonb",true,null,false],
        ["media_url","character varying(500)",true,null,false],
        ["media_type","public.post_media_type",true,null,false],
        ["is_repost","boolean",true,"false",false],
        ["original_post_id","uuid",true,null,false],
        ["repost_comment","character varying(280)",true,null,false],
        ["like_count","integer",false,"0",false],
        ["reply_count","integer",false,"0",false],
        ["created_at","timestamp without time zone",false,"now()",false],
        ["view_count","integer",false,"0",false],
        ["repost_count","integer",false,"0",false]
      ],
      "constraints": [
        ["posts_author_id_users_id_fk","FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["posts_original_post_id_posts_id_fk","FOREIGN KEY (original_post_id) REFERENCES public.posts(id) ON DELETE SET NULL","f"],
        ["posts_pkey","PRIMARY KEY (id)","p"]
      ],
      "indexes": [
        ["posts_author_idx","CREATE INDEX posts_author_idx ON public.posts USING btree (author_id)"],
        ["posts_created_at_idx","CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at)"],
        ["posts_original_post_idx","CREATE INDEX posts_original_post_idx ON public.posts USING btree (original_post_id)"],
        ["posts_plain_repost_unique","CREATE UNIQUE INDEX posts_plain_repost_unique ON public.posts USING btree (author_id, original_post_id) WHERE ((is_repost = true) AND (repost_comment IS NULL) AND (original_post_id IS NOT NULL))"],
        ["posts_repost_comment_trgm_idx","CREATE INDEX posts_repost_comment_trgm_idx ON public.posts USING gin (COALESCE(repost_comment, ''::character varying) public.gin_trgm_ops)"],
        ["posts_text_trgm_idx","CREATE INDEX posts_text_trgm_idx ON public.posts USING gin (COALESCE(text, ''::character varying) public.gin_trgm_ops)"]
      ],
      "policies": [
        {
          "name": "posts_delete_own",
          "command": "d",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = author_id)",
          "check_expression": null
        },
        {
          "name": "posts_insert_own",
          "command": "a",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": null,
          "check_expression": "(auth.uid() = author_id)"
        },
        {
          "name": "posts_select_public",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "true",
          "check_expression": null
        },
        {
          "name": "posts_update_own",
          "command": "w",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = author_id)",
          "check_expression": "(auth.uid() = author_id)"
        }
      ]
    },
    {
      "name": "playlist_tracks",
      "replica": "d",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["user_id","uuid",false,null,false],
        ["title","character varying(100)",false,null,false],
        ["artist","character varying(100)",false,null,false],
        ["file_url","character varying(500)",false,null,false],
        ["cover_url","character varying(500)",true,null,false],
        ["duration_seconds","integer",true,null,false],
        ["added_at","timestamp without time zone",false,"now()",false],
        ["added_from","public.track_source",false,"'upload'::public.track_source",false]
      ],
      "constraints": [
        ["playlist_tracks_pkey","PRIMARY KEY (id)","p"],
        ["playlist_tracks_user_id_users_id_fk","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [
        ["playlist_user_idx","CREATE INDEX playlist_user_idx ON public.playlist_tracks USING btree (user_id)"]
      ],
      "policies": [
        {
          "name": "playlist_tracks_delete_own",
          "command": "d",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": null
        },
        {
          "name": "playlist_tracks_insert_own",
          "command": "a",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": null,
          "check_expression": "(auth.uid() = user_id)"
        },
        {
          "name": "playlist_tracks_select_public",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "true",
          "check_expression": null
        },
        {
          "name": "playlist_tracks_update_own",
          "command": "w",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": "(auth.uid() = user_id)"
        }
      ]
    },
    {
      "name": "chat_members",
      "replica": "d",
      "columns": [
        ["chat_id","uuid",false,null,false],
        ["user_id","uuid",false,null,false],
        ["joined_at","timestamp without time zone",false,"now()",false],
        ["role","character varying(20)",false,"'member'::character varying",false]
      ],
      "constraints": [
        ["chat_members_chat_id_chats_id_fk","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chat_members_chat_id_user_id_pk","PRIMARY KEY (chat_id, user_id)","p"],
        ["chat_members_role_check","CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying]::text[]))","c"],
        ["chat_members_user_id_users_id_fk","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [],
      "policies": [
        {
          "name": "chat_members_delete_self",
          "command": "d",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": null
        },
        {
          "name": "chat_members_select_member",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "public.is_chat_member(chat_id)",
          "check_expression": null
        }
      ]
    },
    {
      "name": "messages",
      "replica": "f",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["chat_id","uuid",false,null,false],
        ["sender_id","uuid",false,null,false],
        ["text","character varying(1000)",true,null,false],
        ["media_url","character varying(500)",true,null,false],
        ["shared_post_id","uuid",true,null,false],
        ["shared_track_id","uuid",true,null,false],
        ["created_at","timestamp without time zone",false,"now()",false],
        ["read_at","timestamp without time zone",true,null,false],
        ["reply_to_message_id","uuid",true,null,false],
        ["media_title","character varying(100)",true,null,false],
        ["media_artist","character varying(100)",true,null,false],
        ["content","jsonb",true,null,true]
      ],
      "constraints": [
        ["messages_chat_id_chats_id_fk","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["messages_content_shape_check","CHECK (content IS NULL OR jsonb_typeof(content) = 'array'::text)","c"],
        ["messages_pkey","PRIMARY KEY (id)","p"],
        ["messages_reply_to_message_id_fkey","FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id) ON DELETE SET NULL","f"],
        ["messages_sender_id_users_id_fk","FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["messages_shared_post_id_posts_id_fk","FOREIGN KEY (shared_post_id) REFERENCES public.posts(id) ON DELETE SET NULL","f"],
        ["messages_shared_track_id_playlist_tracks_id_fk","FOREIGN KEY (shared_track_id) REFERENCES public.playlist_tracks(id) ON DELETE SET NULL","f"]
      ],
      "indexes": [
        ["messages_chat_idx","CREATE INDEX messages_chat_idx ON public.messages USING btree (chat_id)"],
        ["messages_chat_time_idx","CREATE INDEX messages_chat_time_idx ON public.messages USING btree (chat_id, created_at)"],
        ["messages_reply_to_idx","CREATE INDEX messages_reply_to_idx ON public.messages USING btree (reply_to_message_id) WHERE (reply_to_message_id IS NOT NULL)"],
        ["messages_time_idx","CREATE INDEX messages_time_idx ON public.messages USING btree (created_at)"]
      ],
      "policies": [
        {
          "name": "messages_insert_member",
          "command": "a",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": null,
          "check_expression": "((auth.uid() = sender_id) AND public.is_chat_member(chat_id))"
        },
        {
          "name": "messages_select_member",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "public.is_chat_member(chat_id)",
          "check_expression": null
        },
        {
          "name": "messages_update_sender",
          "command": "w",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = sender_id)",
          "check_expression": "(auth.uid() = sender_id)"
        }
      ],
      "fresh": {
        "constraints": [
          ["messages_chat_id_chats_id_fk","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
          ["messages_pkey","PRIMARY KEY (id)","p"],
          ["messages_reply_to_message_id_fkey","FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id) ON DELETE SET NULL","f"],
          ["messages_sender_id_users_id_fk","FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
          ["messages_shared_post_id_posts_id_fk","FOREIGN KEY (shared_post_id) REFERENCES public.posts(id) ON DELETE SET NULL","f"],
          ["messages_shared_track_id_playlist_tracks_id_fk","FOREIGN KEY (shared_track_id) REFERENCES public.playlist_tracks(id) ON DELETE SET NULL","f"]
        ],
        "indexes": [
          ["messages_chat_idx","CREATE INDEX messages_chat_idx ON public.messages USING btree (chat_id)"],
          ["messages_chat_time_idx","CREATE INDEX messages_chat_time_idx ON public.messages USING btree (chat_id, created_at)"],
          ["messages_reply_to_idx","CREATE INDEX messages_reply_to_idx ON public.messages USING btree (reply_to_message_id) WHERE (reply_to_message_id IS NOT NULL)"],
          ["messages_time_idx","CREATE INDEX messages_time_idx ON public.messages USING btree (created_at)"]
        ]
      }
    },
    {
      "name": "message_reactions",
      "replica": "d",
      "columns": [
        ["message_id","uuid",false,null,false],
        ["chat_id","uuid",false,null,false],
        ["user_id","uuid",false,null,false],
        ["emoji","character varying(10)",true,null,false],
        ["created_at","timestamp without time zone",false,"now()",false],
        ["emoji_id","uuid",true,null,true]
      ],
      "constraints": [
        ["message_reactions_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["message_reactions_emoji_id_fkey","FOREIGN KEY (emoji_id) REFERENCES public.group_emojis(id) ON DELETE SET NULL","f"],
        ["message_reactions_emoji_source_check","CHECK (emoji IS NOT NULL AND emoji_id IS NULL OR emoji IS NULL AND emoji_id IS NOT NULL)","c"],
        ["message_reactions_message_id_fkey","FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE","f"],
        ["message_reactions_user_id_fkey","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [
        ["message_reactions_chat_idx","CREATE INDEX message_reactions_chat_idx ON public.message_reactions USING btree (chat_id)"],
        ["message_reactions_custom_unique","CREATE UNIQUE INDEX message_reactions_custom_unique ON public.message_reactions USING btree (message_id, user_id, emoji_id) WHERE (emoji_id IS NOT NULL)"],
        ["message_reactions_message_idx","CREATE INDEX message_reactions_message_idx ON public.message_reactions USING btree (message_id)"],
        ["message_reactions_native_unique","CREATE UNIQUE INDEX message_reactions_native_unique ON public.message_reactions USING btree (message_id, user_id, emoji) WHERE (emoji IS NOT NULL)"]
      ],
      "policies": [],
      "fresh": {
        "constraints": [
          ["message_reactions_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
          ["message_reactions_message_id_fkey","FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE","f"],
          ["message_reactions_user_id_fkey","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
          ["message_reactions_pkey","PRIMARY KEY (message_id, user_id, emoji)","p"]
        ],
        "indexes": [
          ["message_reactions_chat_idx","CREATE INDEX message_reactions_chat_idx ON public.message_reactions USING btree (chat_id)"],
          ["message_reactions_message_idx","CREATE INDEX message_reactions_message_idx ON public.message_reactions USING btree (message_id)"]
        ]
      }
    },
    {
      "name": "chat_invites",
      "replica": "d",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["chat_id","uuid",false,null,false],
        ["created_by","uuid",false,null,false],
        ["token_hash","character varying(64)",false,null,false],
        ["expires_at","timestamp without time zone",true,null,false],
        ["max_uses","integer",true,"20",false],
        ["use_count","integer",false,"0",false],
        ["revoked_at","timestamp without time zone",true,null,false],
        ["created_at","timestamp without time zone",false,"now()",false]
      ],
      "constraints": [
        ["chat_invites_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chat_invites_created_by_fkey","FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["chat_invites_max_uses_check","CHECK (max_uses >= 1 AND max_uses <= 100)","c"],
        ["chat_invites_pkey","PRIMARY KEY (id)","p"],
        ["chat_invites_token_hash_unique","UNIQUE (token_hash)","u"],
        ["chat_invites_use_count_check","CHECK (use_count >= 0)","c"]
      ],
      "indexes": [
        ["chat_invites_chat_idx","CREATE INDEX chat_invites_chat_idx ON public.chat_invites USING btree (chat_id, created_at DESC)"]
      ],
      "policies": []
    },
    {
      "name": "chat_audit_log",
      "replica": "d",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["chat_id","uuid",false,null,false],
        ["actor_id","uuid",true,null,false],
        ["target_user_id","uuid",true,null,false],
        ["action","character varying(40)",false,null,false],
        ["details","jsonb",false,"'{}'::jsonb",false],
        ["created_at","timestamp with time zone",false,"now()",false]
      ],
      "constraints": [
        ["chat_audit_log_action_check","CHECK (action::text = ANY (ARRAY['member_added'::character varying, 'member_removed'::character varying, 'member_left'::character varying, 'role_changed'::character varying, 'ownership_transferred'::character varying, 'topics_changed'::character varying, 'visibility_changed'::character varying, 'group_name_changed'::character varying]::text[]))","c"],
        ["chat_audit_log_actor_id_fkey","FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL","f"],
        ["chat_audit_log_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chat_audit_log_pkey","PRIMARY KEY (id)","p"],
        ["chat_audit_log_target_user_id_fkey","FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL","f"]
      ],
      "indexes": [
        ["chat_audit_log_chat_created_idx","CREATE INDEX chat_audit_log_chat_created_idx ON public.chat_audit_log USING btree (chat_id, created_at DESC)"]
      ],
      "policies": [],
      "fresh": {
        "constraints": [
          ["chat_audit_log_action_check","CHECK (action::text = ANY (ARRAY['member_added'::character varying, 'member_removed'::character varying, 'member_left'::character varying, 'role_changed'::character varying, 'ownership_transferred'::character varying, 'topics_changed'::character varying, 'visibility_changed'::character varying]::text[]))","c"],
          ["chat_audit_log_actor_id_fkey","FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL","f"],
          ["chat_audit_log_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
          ["chat_audit_log_pkey","PRIMARY KEY (id)","p"],
          ["chat_audit_log_target_user_id_fkey","FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE SET NULL","f"]
        ],
        "indexes": [
          ["chat_audit_log_chat_created_idx","CREATE INDEX chat_audit_log_chat_created_idx ON public.chat_audit_log USING btree (chat_id, created_at DESC)"]
        ]
      }
    },
    {
      "name": "direct_chat_pairs",
      "replica": "d",
      "columns": [
        ["chat_id","uuid",false,null,false],
        ["user_low_id","uuid",false,null,false],
        ["user_high_id","uuid",false,null,false],
        ["created_at","timestamp without time zone",false,"now()",false]
      ],
      "constraints": [
        ["direct_chat_pairs_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["direct_chat_pairs_order_check","CHECK (user_low_id::text < user_high_id::text)","c"],
        ["direct_chat_pairs_pkey","PRIMARY KEY (chat_id)","p"],
        ["direct_chat_pairs_user_high_id_fkey","FOREIGN KEY (user_high_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["direct_chat_pairs_user_low_id_fkey","FOREIGN KEY (user_low_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["direct_chat_pairs_users_unique","UNIQUE (user_low_id, user_high_id)","u"]
      ],
      "indexes": [],
      "policies": []
    },
    {
      "name": "follows",
      "replica": "d",
      "columns": [
        ["follower_id","uuid",false,null,false],
        ["following_id","uuid",false,null,false],
        ["created_at","timestamp without time zone",false,"now()",false]
      ],
      "constraints": [
        ["follows_follower_id_following_id_pk","PRIMARY KEY (follower_id, following_id)","p"],
        ["follows_follower_id_users_id_fk","FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["follows_following_id_users_id_fk","FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [
        ["follows_follower_idx","CREATE INDEX follows_follower_idx ON public.follows USING btree (follower_id)"],
        ["follows_following_idx","CREATE INDEX follows_following_idx ON public.follows USING btree (following_id)"]
      ],
      "policies": [
        {
          "name": "follows_delete_own",
          "command": "d",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = follower_id)",
          "check_expression": null
        },
        {
          "name": "follows_insert_own",
          "command": "a",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": null,
          "check_expression": "(auth.uid() = follower_id)"
        },
        {
          "name": "follows_select_public",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "true",
          "check_expression": null
        }
      ]
    },
    {
      "name": "chat_rooms",
      "replica": "d",
      "columns": [
        ["chat_id","uuid",false,null,false],
        ["status","character varying(20)",false,"'active'::character varying",false],
        ["access_mode","character varying(20)",false,"'open'::character varying",false],
        ["started_by","uuid",false,null,false],
        ["started_at","timestamp without time zone",false,"now()",false],
        ["ended_at","timestamp without time zone",true,null,false],
        ["updated_at","timestamp without time zone",false,"now()",false],
        ["session_id","uuid",false,"gen_random_uuid()",true]
      ],
      "constraints": [
        ["chat_rooms_access_mode_check","CHECK (access_mode::text = ANY (ARRAY['open'::character varying, 'locked'::character varying]::text[]))","c"],
        ["chat_rooms_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chat_rooms_pkey","PRIMARY KEY (chat_id)","p"],
        ["chat_rooms_started_by_fkey","FOREIGN KEY (started_by) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["chat_rooms_status_check","CHECK (status::text = ANY (ARRAY['ringing'::character varying, 'active'::character varying, 'ended'::character varying, 'declined'::character varying, 'cancelled'::character varying, 'missed'::character varying]::text[]))","c"]
      ],
      "indexes": [],
      "policies": [
        {
          "name": "chat_rooms_select_member",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "public.is_chat_member(chat_id)",
          "check_expression": null
        }
      ]
    },
    {
      "name": "chat_room_participants",
      "replica": "d",
      "columns": [
        ["chat_id","uuid",false,null,false],
        ["user_id","uuid",false,null,false],
        ["mic_muted","boolean",false,"true",false],
        ["joined_at","timestamp without time zone",false,"now()",false],
        ["last_seen_at","timestamp without time zone",false,"now()",false]
      ],
      "constraints": [
        ["chat_room_participants_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chat_room_participants_pk","PRIMARY KEY (chat_id, user_id)","p"],
        ["chat_room_participants_user_id_fkey","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [
        ["chat_room_participants_heartbeat_idx","CREATE INDEX chat_room_participants_heartbeat_idx ON public.chat_room_participants USING btree (chat_id, last_seen_at DESC)"]
      ],
      "policies": [
        {
          "name": "chat_room_participants_select_member",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "public.is_chat_member(chat_id)",
          "check_expression": null
        }
      ]
    },
    {
      "name": "chat_section_members",
      "replica": "d",
      "columns": [
        ["chat_id","uuid",false,null,false],
        ["user_id","uuid",false,null,false],
        ["created_at","timestamp without time zone",false,"now()",false]
      ],
      "constraints": [
        ["chat_section_members_chat_id_fkey","FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE","f"],
        ["chat_section_members_pkey","PRIMARY KEY (chat_id, user_id)","p"],
        ["chat_section_members_user_id_fkey","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [
        ["chat_section_members_user_idx","CREATE INDEX chat_section_members_user_idx ON public.chat_section_members USING btree (user_id, chat_id)"]
      ],
      "policies": []
    },
    {
      "name": "notifications",
      "replica": "f",
      "columns": [
        ["id","uuid",false,"gen_random_uuid()",false],
        ["user_id","uuid",false,null,false],
        ["type","public.notif_type",false,null,false],
        ["actor_id","uuid",true,null,false],
        ["reference_id","uuid",true,null,false],
        ["read","boolean",false,"false",false],
        ["created_at","timestamp without time zone",false,"now()",false]
      ],
      "constraints": [
        ["notifications_actor_id_users_id_fk","FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE","f"],
        ["notifications_pkey","PRIMARY KEY (id)","p"],
        ["notifications_user_id_users_id_fk","FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE","f"]
      ],
      "indexes": [
        ["notif_user_unread_idx","CREATE INDEX notif_user_unread_idx ON public.notifications USING btree (user_id, read)"]
      ],
      "policies": [
        {
          "name": "notifications_select_own",
          "command": "r",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": null
        },
        {
          "name": "notifications_update_own",
          "command": "w",
          "permissive": true,
          "roles": ["PUBLIC"],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": "(auth.uid() = user_id)"
        }
      ]
    }
  ],
  "body": "\n  SELECT EXISTS (\n    SELECT 1\n    FROM public.chats requested_chat\n    JOIN public.chat_members member\n      ON member.chat_id = COALESCE(requested_chat.parent_chat_id, requested_chat.id)\n    WHERE requested_chat.id = p_chat_id\n      AND member.user_id = auth.uid()\n  );\n"
}$contract$::jsonb;
  t jsonb; shape jsonb; item jsonb; col jsonb; enum_spec jsonb;
  table_oid oid; actual record; labels jsonb; evolved boolean;
  expected text; actual_text text; fresh_text text; body text;
BEGIN
  FOR enum_spec IN SELECT value FROM jsonb_array_elements(contract->'enums') LOOP
    SELECT typtype, oid INTO actual FROM pg_type
      WHERE oid = to_regtype('public.' || (enum_spec->>0));
    IF NOT FOUND OR actual.typtype <> 'e' THEN
      RAISE EXCEPTION 'Core baseline incompatible enum %', enum_spec->>0;
    END IF;
    SELECT jsonb_agg(enumlabel ORDER BY enumsortorder) INTO labels FROM pg_enum WHERE enumtypid = actual.oid;
    IF enum_spec->>0 = 'notif_type' AND NOT require_current THEN
      IF labels NOT IN (enum_spec->1, (SELECT jsonb_agg(value) FROM jsonb_array_elements(enum_spec->1) WITH ORDINALITY e(value,n) WHERE n <= 9),
        (SELECT jsonb_agg(value) FROM jsonb_array_elements(enum_spec->1) WITH ORDINALITY e(value,n) WHERE n <= 10)) THEN
        RAISE EXCEPTION 'Core baseline incompatible notif_type labels/order';
      END IF;
    ELSIF labels IS DISTINCT FROM enum_spec->1 THEN
      RAISE EXCEPTION 'Core baseline incompatible enum labels/order %', enum_spec->>0;
    END IF;
  END LOOP;

  FOR t IN SELECT value FROM jsonb_array_elements(contract->'tables') LOOP
    table_oid := to_regclass('public.' || (t->>'name'));
    SELECT relkind, relrowsecurity, relforcerowsecurity, relreplident INTO actual FROM pg_class WHERE oid = table_oid;
    IF NOT FOUND OR actual.relkind <> 'r' OR NOT actual.relrowsecurity OR actual.relforcerowsecurity THEN
      RAISE EXCEPTION 'Core baseline incompatible table/RLS %', t->>'name';
    END IF;
    IF t->>'replica' = 'f' AND actual.relreplident <> 'f'
      OR t->>'name' = 'message_reactions' AND (require_current OR EXISTS (
        SELECT 1 FROM public.app_schema_migrations WHERE id = '47-message-reactions-replica-identity.sql'
      )) AND actual.relreplident <> 'f' THEN
      RAISE EXCEPTION 'Core baseline incompatible replica identity %', t->>'name';
    END IF;
    evolved := require_current OR EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = table_oid
      AND NOT attisdropped AND attname = CASE t->>'name'
        WHEN 'message_reactions' THEN 'emoji_id' WHEN 'chats' THEN 'join_policy' WHEN 'messages' THEN 'content' ELSE '__none__' END);
    shape := CASE WHEN evolved THEN t ELSE coalesce(t->'fresh',t) END;
    IF t->>'name' = 'chat_audit_log' THEN shape := t; END IF;
    FOR col IN SELECT value FROM jsonb_array_elements(t->'columns') LOOP
      SELECT format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull, a.attidentity, a.attgenerated,
        pg_get_expr(d.adbin,d.adrelid) AS default_expr,
        n.nspname AS type_schema, typ.typname AS type_name
      INTO actual FROM pg_attribute a JOIN pg_type typ ON typ.oid = a.atttypid
        JOIN pg_namespace n ON n.oid = typ.typnamespace
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = table_oid AND a.attname = col->>0 AND a.attnum > 0 AND NOT a.attisdropped;
      IF NOT FOUND AND (col->>4)::boolean AND NOT require_current THEN CONTINUE; END IF;
      IF NOT FOUND THEN RAISE EXCEPTION 'Core baseline missing column %.%', t->>'name', col->>0; END IF;
      IF replace(actual.type,'public.','') <> replace(col->>1,'public.','')
        OR (col->>1 LIKE 'public.%' AND actual.type_schema <> 'public')
        OR actual.attidentity <> '' OR actual.attgenerated <> '' THEN
        RAISE EXCEPTION 'Core baseline incompatible column type %.%', t->>'name', col->>0;
      END IF;
      -- 39 relaxes emoji; 48 relaxes invite limits. Both transitional shapes are
      -- accepted during adoption, but readiness demands the evolved shape.
      IF t->>'name' = 'message_reactions' AND col->>0 = 'emoji' THEN
        IF actual.attnotnull = evolved THEN RAISE EXCEPTION 'Core baseline incompatible reaction nullability'; END IF;
      ELSIF t->>'name' = 'chat_invites' AND col->>0 IN ('expires_at','max_uses') THEN
        IF (require_current OR EXISTS (SELECT 1 FROM public.app_schema_migrations WHERE id = '48-group-baseline-identity.sql'))
          AND actual.attnotnull THEN RAISE EXCEPTION 'Core baseline incompatible invite nullability'; END IF;
      ELSIF actual.attnotnull = (col->>2)::boolean THEN
        RAISE EXCEPTION 'Core baseline incompatible nullability %.%', t->>'name', col->>0;
      END IF;
      IF replace(actual.default_expr,'public.','') IS DISTINCT FROM replace(col->>3,'public.','') THEN
        RAISE EXCEPTION 'Core baseline incompatible default %.%', t->>'name', col->>0;
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(shape->'constraints') LOOP
      expected := regexp_replace(replace(item->>1,'public.',''),'\s+',' ','g');
      SELECT value->>1 INTO fresh_text FROM jsonb_array_elements(t->'fresh'->'constraints') WHERE value->>0 = item->>0;
      fresh_text := regexp_replace(replace(fresh_text,'public.',''),'\s+',' ','g');
      -- PostgreSQL may push an array-to-text cast into each literal on replay.
      expected := replace(replace(expected,'::character varying::text','::character varying'),']::text[]',']');
      fresh_text := replace(replace(fresh_text,'::character varying::text','::character varying'),']::text[]',']');
      IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid = table_oid AND c.contype::text = item->>2
        AND c.convalidated AND NOT c.condeferrable AND NOT c.condeferred
        AND (c.contype NOT IN ('p','u') OR EXISTS (SELECT 1 FROM pg_index ki WHERE ki.indexrelid=c.conindid AND ki.indisvalid AND ki.indisready AND ki.indislive))
        AND (replace(replace(regexp_replace(replace(pg_get_constraintdef(c.oid,true),'public.',''),'\s+',' ','g'),'::character varying::text','::character varying'),']::text[]',']') = expected
          OR (NOT require_current AND t->>'name' = 'chat_audit_log' AND item->>0 = 'chat_audit_log_action_check'
            AND replace(replace(regexp_replace(replace(pg_get_constraintdef(c.oid,true),'public.',''),'\s+',' ','g'),'::character varying::text','::character varying'),']::text[]',']') = fresh_text))) THEN
        RAISE EXCEPTION 'Core baseline incompatible constraint %.%', t->>'name', item->>0;
      END IF;
    END LOOP;
    IF t->>'name' = 'message_reactions' AND evolved AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = table_oid AND contype = 'p') THEN
      RAISE EXCEPTION 'Core baseline obsolete reaction primary key';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(shape->'indexes') LOOP
      expected := regexp_replace(replace(item->>1,'public.',''),'\s+',' ','g');
      SELECT regexp_replace(replace(pg_get_indexdef(i.indexrelid),'public.',''),'\s+',' ','g') INTO actual_text
        FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid
        WHERE i.indrelid = table_oid AND idx.relname = item->>0 AND i.indisvalid AND i.indisready AND i.indislive;
      -- pg_trgm may be installed in the Supabase extensions schema.
      IF expected LIKE '%gin_trgm_ops%' THEN
      SELECT replace(actual_text,n.nspname || '.gin_trgm_ops','gin_trgm_ops') INTO actual_text
        FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm';
      END IF;
      IF actual_text IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Core baseline incompatible index %.%', t->>'name', item->>0;
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'policies') LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = table_oid AND p.polname = item->>'name'
        AND p.polcmd::text = item->>'command' AND p.polpermissive = (item->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(p.polroles) r) = item->'roles'
        AND replace(pg_get_expr(p.polqual,p.polrelid),'public.','') IS NOT DISTINCT FROM replace(item->>'using_expression','public.','')
        AND replace(pg_get_expr(p.polwithcheck,p.polrelid),'public.','') IS NOT DISTINCT FROM replace(item->>'check_expression','public.','')) THEN
        RAISE EXCEPTION 'Core baseline incompatible policy %.%', t->>'name', item->>'name';
      END IF;
    END LOOP;
    IF t->>'name' IN ('chat_invites','chat_audit_log') AND EXISTS (
      SELECT 1 FROM unnest(ARRAY['anon','authenticated']) r
      WHERE has_table_privilege(r,table_oid,'SELECT,INSERT,UPDATE,DELETE')
        OR has_any_column_privilege(r,table_oid,'SELECT,INSERT,UPDATE')
    ) THEN RAISE EXCEPTION 'Core baseline incompatible server-only access %', t->>'name'; END IF;
  END LOOP;
  SELECT p.*, l.lanname INTO actual FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
    WHERE p.oid = to_regprocedure('public.is_chat_member(uuid)');
  IF NOT FOUND OR actual.prorettype <> 'boolean'::regtype OR actual.proretset
    OR actual.lanname <> 'sql' OR NOT actual.prosecdef OR actual.provolatile <> 's'
    OR actual.proisstrict OR actual.pronargdefaults <> 0
    OR actual.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[] THEN
    RAISE EXCEPTION 'Core baseline incompatible is_chat_member signature/security/search_path';
  END IF;
  body := regexp_replace(lower(actual.prosrc),'\s|;','','g');
  IF body <> regexp_replace(lower(contract->>'body'),'\s|;','','g') THEN
    RAISE EXCEPTION 'Core baseline incompatible section-aware is_chat_member semantics';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) r
    WHERE NOT has_function_privilege(r,actual.oid,'EXECUTE')) THEN
    RAISE EXCEPTION 'Core baseline is_chat_member must remain executable by RLS roles';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles r WHERE r.oid=actual.proowner AND (r.rolsuper OR r.rolbypassrls))
    AND EXISTS (SELECT 1 FROM pg_class WHERE oid IN ('public.chats'::regclass,'public.chat_members'::regclass)
      AND relowner <> actual.proowner) THEN
    RAISE EXCEPTION 'Core baseline incompatible is_chat_member owner RLS bypass';
  END IF;
END $validate$;
-- END CORE BASELINE READ-ONLY VALIDATION
