-- Notification when someone draws on profile canvas (actor hidden in UI for now).

DO $$
BEGIN
  ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'profile_canvas_draw';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
