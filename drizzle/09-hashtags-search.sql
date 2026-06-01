-- Post hashtags and search indexes.

CREATE TABLE IF NOT EXISTS public.hashtags (
  name varchar(64) PRIMARY KEY NOT NULL,
  post_count integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_name varchar(64) NOT NULL REFERENCES public.hashtags(name) ON DELETE CASCADE,
  created_at timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY (post_id, hashtag_name)
);

CREATE INDEX IF NOT EXISTS post_hashtags_hashtag_idx
  ON public.post_hashtags USING btree (hashtag_name, created_at);

CREATE INDEX IF NOT EXISTS users_username_search_idx
  ON public.users USING btree (lower(username));

CREATE INDEX IF NOT EXISTS users_display_name_search_idx
  ON public.users USING btree (lower(display_name));

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hashtags_select_public" ON public.hashtags;
DROP POLICY IF EXISTS "post_hashtags_select_public" ON public.post_hashtags;

CREATE POLICY "hashtags_select_public"
  ON public.hashtags FOR SELECT
  USING (true);

CREATE POLICY "post_hashtags_select_public"
  ON public.post_hashtags FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.set_post_hashtags(
  p_post_id uuid,
  p_tags text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag_names text[];
  v_touched text[];
BEGIN
  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Post id is required';
  END IF;

  SELECT coalesce(array_agg(DISTINCT tag), ARRAY[]::text[])
  INTO v_tag_names
  FROM (
    SELECT lower(regexp_replace(btrim(tag), '^#', '')) AS tag
    FROM unnest(coalesce(p_tags, ARRAY[]::text[])) AS tag
  ) normalized
  WHERE tag ~ '^[[:alnum:]_]{1,64}$';

  SELECT coalesce(array_agg(hashtag_name), ARRAY[]::text[])
  INTO v_touched
  FROM public.post_hashtags
  WHERE post_id = p_post_id;

  DELETE FROM public.post_hashtags
  WHERE post_id = p_post_id
    AND NOT (hashtag_name = ANY(v_tag_names));

  INSERT INTO public.hashtags (name)
  SELECT unnest(v_tag_names)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.post_hashtags (post_id, hashtag_name)
  SELECT p_post_id, unnest(v_tag_names)
  ON CONFLICT (post_id, hashtag_name) DO NOTHING;

  v_touched := (
    SELECT coalesce(array_agg(DISTINCT tag), ARRAY[]::text[])
    FROM unnest(v_touched || v_tag_names) AS tag
  );

  UPDATE public.hashtags h
  SET post_count = (
    SELECT count(*)::integer
    FROM public.post_hashtags ph
    WHERE ph.hashtag_name = h.name
  )
  WHERE h.name = ANY(v_touched);
END;
$$;

REVOKE ALL ON FUNCTION public.set_post_hashtags(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_post_hashtags(uuid, text[]) TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.hashtags;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_hashtags;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.hashtags REPLICA IDENTITY FULL;
ALTER TABLE public.post_hashtags REPLICA IDENTITY FULL;
