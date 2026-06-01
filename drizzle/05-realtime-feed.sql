-- Realtime feed: publish new posts to browser subscribers.
-- Run after 02-rls-policies.sql.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.posts REPLICA IDENTITY FULL;
