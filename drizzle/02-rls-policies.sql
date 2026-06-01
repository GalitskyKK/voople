-- Row Level Security для всех таблиц public.*
-- Supabase → SQL Editor → Run (после apply-in-supabase-dashboard.sql)
--
-- Защищает PostgREST / Supabase Client (anon + JWT).
-- Next.js + Drizzle (роль postgres) обходит RLS — авторизация в tRPC/API.

-- ---------------------------------------------------------------------------
-- Helper: членство в чате (SECURITY DEFINER — без рекурсии RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_members cm
    WHERE cm.chat_id = p_chat_id
      AND cm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_chat_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Сброс старых политик (повторный запуск безопасен)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_public" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "customization_all_own" ON public.profile_customization;
DROP POLICY IF EXISTS "status_all_own" ON public.user_status;

DROP POLICY IF EXISTS "profile_customization_select_public" ON public.profile_customization;
DROP POLICY IF EXISTS "profile_customization_insert_own" ON public.profile_customization;
DROP POLICY IF EXISTS "profile_customization_update_own" ON public.profile_customization;
DROP POLICY IF EXISTS "profile_customization_delete_own" ON public.profile_customization;

DROP POLICY IF EXISTS "user_status_select_public" ON public.user_status;
DROP POLICY IF EXISTS "user_status_insert_own" ON public.user_status;
DROP POLICY IF EXISTS "user_status_update_own" ON public.user_status;
DROP POLICY IF EXISTS "user_status_delete_own" ON public.user_status;

DROP POLICY IF EXISTS "status_history_select_own" ON public.status_history;
DROP POLICY IF EXISTS "status_history_insert_own" ON public.status_history;
DROP POLICY IF EXISTS "status_history_update_own" ON public.status_history;
DROP POLICY IF EXISTS "status_history_delete_own" ON public.status_history;

DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_own" ON public.posts;
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;

DROP POLICY IF EXISTS "likes_select_public" ON public.likes;
DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own" ON public.likes;

DROP POLICY IF EXISTS "card_reactions_select_public" ON public.card_reactions;
DROP POLICY IF EXISTS "card_reactions_insert_own" ON public.card_reactions;
DROP POLICY IF EXISTS "card_reactions_delete_own" ON public.card_reactions;

DROP POLICY IF EXISTS "follows_select_public" ON public.follows;
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;

DROP POLICY IF EXISTS "profile_views_select_profile_owner" ON public.profile_views;
DROP POLICY IF EXISTS "profile_views_insert_own" ON public.profile_views;

DROP POLICY IF EXISTS "playlist_tracks_select_public" ON public.playlist_tracks;
DROP POLICY IF EXISTS "playlist_tracks_insert_own" ON public.playlist_tracks;
DROP POLICY IF EXISTS "playlist_tracks_update_own" ON public.playlist_tracks;
DROP POLICY IF EXISTS "playlist_tracks_delete_own" ON public.playlist_tracks;

DROP POLICY IF EXISTS "user_anthem_select_public" ON public.user_anthem;
DROP POLICY IF EXISTS "user_anthem_insert_own" ON public.user_anthem;
DROP POLICY IF EXISTS "user_anthem_update_own" ON public.user_anthem;
DROP POLICY IF EXISTS "user_anthem_delete_own" ON public.user_anthem;

DROP POLICY IF EXISTS "chats_select_member" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_authenticated" ON public.chats;

DROP POLICY IF EXISTS "chat_members_select_member" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;

DROP POLICY IF EXISTS "messages_select_member" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_member" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender" ON public.messages;

DROP POLICY IF EXISTS "shop_items_select_public" ON public.shop_items;

DROP POLICY IF EXISTS "user_inventory_select_own" ON public.user_inventory;
DROP POLICY IF EXISTS "user_inventory_insert_own" ON public.user_inventory;

DROP POLICY IF EXISTS "user_badges_select_public" ON public.user_badges;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

-- ---------------------------------------------------------------------------
-- RLS ON
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_anthem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE POLICY "users_select_public"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- profile_customization (публичное чтение для профилей)
-- ---------------------------------------------------------------------------
CREATE POLICY "profile_customization_select_public"
  ON public.profile_customization FOR SELECT
  USING (true);

CREATE POLICY "profile_customization_insert_own"
  ON public.profile_customization FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_customization_update_own"
  ON public.profile_customization FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_customization_delete_own"
  ON public.profile_customization FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_status (блок на профиле — читают все)
-- ---------------------------------------------------------------------------
CREATE POLICY "user_status_select_public"
  ON public.user_status FOR SELECT
  USING (true);

CREATE POLICY "user_status_insert_own"
  ON public.user_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_status_update_own"
  ON public.user_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_status_delete_own"
  ON public.user_status FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- status_history (только владелец)
-- ---------------------------------------------------------------------------
CREATE POLICY "status_history_select_own"
  ON public.status_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "status_history_insert_own"
  ON public.status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "status_history_update_own"
  ON public.status_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "status_history_delete_own"
  ON public.status_history FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- posts, likes, follows, card_reactions
-- ---------------------------------------------------------------------------
CREATE POLICY "posts_select_public"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "posts_insert_own"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update_own"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_delete_own"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "likes_select_public"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "likes_insert_own"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "card_reactions_select_public"
  ON public.card_reactions FOR SELECT
  USING (true);

CREATE POLICY "card_reactions_insert_own"
  ON public.card_reactions FOR INSERT
  WITH CHECK (auth.uid() = reactor_user_id);

CREATE POLICY "card_reactions_delete_own"
  ON public.card_reactions FOR DELETE
  USING (auth.uid() = reactor_user_id);

CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- profile_views
-- ---------------------------------------------------------------------------
CREATE POLICY "profile_views_select_profile_owner"
  ON public.profile_views FOR SELECT
  USING (auth.uid() = profile_user_id);

CREATE POLICY "profile_views_insert_own"
  ON public.profile_views FOR INSERT
  WITH CHECK (
    auth.uid() = viewer_user_id
    AND viewer_user_id IS DISTINCT FROM profile_user_id
  );

-- ---------------------------------------------------------------------------
-- playlist_tracks, user_anthem
-- ---------------------------------------------------------------------------
CREATE POLICY "playlist_tracks_select_public"
  ON public.playlist_tracks FOR SELECT
  USING (true);

CREATE POLICY "playlist_tracks_insert_own"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playlist_tracks_update_own"
  ON public.playlist_tracks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "playlist_tracks_delete_own"
  ON public.playlist_tracks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "user_anthem_select_public"
  ON public.user_anthem FOR SELECT
  USING (true);

CREATE POLICY "user_anthem_insert_own"
  ON public.user_anthem FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_anthem_update_own"
  ON public.user_anthem FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_anthem_delete_own"
  ON public.user_anthem FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chats, chat_members, messages
-- ---------------------------------------------------------------------------
CREATE POLICY "chats_select_member"
  ON public.chats FOR SELECT
  USING (public.is_chat_member(id));

CREATE POLICY "chats_insert_authenticated"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_members_select_member"
  ON public.chat_members FOR SELECT
  USING (public.is_chat_member(chat_id));

CREATE POLICY "chat_members_delete_self"
  ON public.chat_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "messages_select_member"
  ON public.messages FOR SELECT
  USING (public.is_chat_member(chat_id));

CREATE POLICY "messages_insert_member"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_chat_member(chat_id)
  );

CREATE POLICY "messages_update_sender"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- ---------------------------------------------------------------------------
-- shop, inventory, badges, subscriptions, notifications
-- ---------------------------------------------------------------------------
CREATE POLICY "shop_items_select_public"
  ON public.shop_items FOR SELECT
  USING (true);

CREATE POLICY "user_inventory_select_own"
  ON public.user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_badges_select_public"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
