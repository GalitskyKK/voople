-- Realtime notifications for live inbox updates.
-- Run after 02-rls-policies.sql.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
