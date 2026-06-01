-- Voople: сброс ЧАСТИЧНОЙ миграции (dev only)
-- Запусти в Supabase SQL Editor ПЕРЕД apply-in-supabase-dashboard.sql
-- если ошибка "type ... already exists" и таблиц нет

DROP SCHEMA IF EXISTS drizzle CASCADE;

DROP TABLE IF EXISTS
  card_reactions,
  chat_members,
  chats,
  follows,
  likes,
  messages,
  notifications,
  playlist_tracks,
  posts,
  profile_customization,
  profile_views,
  shop_items,
  status_history,
  subscriptions,
  user_anthem,
  user_badges,
  user_inventory,
  user_status,
  users
CASCADE;

DROP TYPE IF EXISTS
  acquired_via,
  avatar_type,
  banner_type,
  chat_type,
  item_type,
  notif_type,
  post_media_type,
  subscription_tier,
  track_source;
