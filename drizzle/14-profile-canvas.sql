-- Interactive profile card canvas strokes (vector, normalized points in JSON).

CREATE TABLE IF NOT EXISTS public.profile_canvas_strokes (
  id uuid PRIMARY KEY,
  profile_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  color varchar(20) NOT NULL,
  size integer NOT NULL,
  points jsonb NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT profile_canvas_strokes_size_check CHECK (size >= 1 AND size <= 64)
);

CREATE INDEX IF NOT EXISTS profile_canvas_strokes_profile_time_idx
  ON public.profile_canvas_strokes USING btree (profile_user_id, created_at);

CREATE INDEX IF NOT EXISTS profile_canvas_strokes_author_idx
  ON public.profile_canvas_strokes USING btree (author_id);

ALTER TABLE public.profile_canvas_strokes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_canvas_strokes_select_public" ON public.profile_canvas_strokes;
DROP POLICY IF EXISTS "profile_canvas_strokes_insert_auth" ON public.profile_canvas_strokes;

CREATE POLICY "profile_canvas_strokes_select_public"
  ON public.profile_canvas_strokes FOR SELECT
  USING (true);

CREATE POLICY "profile_canvas_strokes_insert_auth"
  ON public.profile_canvas_strokes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_canvas_strokes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profile_canvas_strokes REPLICA IDENTITY FULL;
