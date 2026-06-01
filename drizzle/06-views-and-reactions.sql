-- Post/profile views and profile reactions hardening.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS public.post_views (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT post_views_post_id_viewer_user_id_pk PRIMARY KEY (post_id, viewer_user_id)
);

CREATE INDEX IF NOT EXISTS post_views_viewer_idx
  ON public.post_views USING btree (viewer_user_id);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_views_select_post_author" ON public.post_views;
DROP POLICY IF EXISTS "post_views_insert_own" ON public.post_views;

CREATE POLICY "post_views_select_post_author"
  ON public.post_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_views.post_id
        AND p.author_id = auth.uid()
    )
  );

CREATE POLICY "post_views_insert_own"
  ON public.post_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_user_id);

CREATE OR REPLACE FUNCTION public.record_post_view(
  p_post_id uuid,
  p_viewer_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_rows integer := 0;
  v_view_count integer;
BEGIN
  IF p_post_id IS NULL OR p_viewer_user_id IS NULL THEN
    RAISE EXCEPTION 'Post id and viewer id are required';
  END IF;

  SELECT author_id
  INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_author_id = p_viewer_user_id THEN
    SELECT view_count INTO v_view_count FROM public.posts WHERE id = p_post_id;
    RETURN COALESCE(v_view_count, 0);
  END IF;

  INSERT INTO public.post_views (post_id, viewer_user_id)
  VALUES (p_post_id, p_viewer_user_id)
  ON CONFLICT (post_id, viewer_user_id)
  DO UPDATE SET viewed_at = now()
  WHERE false;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    UPDATE public.posts
    SET view_count = view_count + 1
    WHERE id = p_post_id
    RETURNING view_count INTO v_view_count;
  ELSE
    SELECT view_count INTO v_view_count FROM public.posts WHERE id = p_post_id;
  END IF;

  RETURN COALESCE(v_view_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_post_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_profile_view(
  p_profile_user_id uuid,
  p_viewer_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_view_count integer;
BEGIN
  IF p_profile_user_id IS NULL OR p_viewer_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile id and viewer id are required';
  END IF;

  IF p_profile_user_id <> p_viewer_user_id THEN
    INSERT INTO public.profile_views (profile_user_id, viewer_user_id)
    VALUES (p_profile_user_id, p_viewer_user_id)
    ON CONFLICT (profile_user_id, viewer_user_id)
    DO UPDATE SET viewed_at = now();
  END IF;

  SELECT COUNT(*)::integer
  INTO v_view_count
  FROM public.profile_views
  WHERE profile_user_id = p_profile_user_id;

  RETURN COALESCE(v_view_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_profile_view(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid, uuid) TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.card_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.profile_views REPLICA IDENTITY FULL;
ALTER TABLE public.card_reactions REPLICA IDENTITY FULL;
