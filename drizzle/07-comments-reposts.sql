-- Comments and repost counters.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS repost_count integer DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS posts_original_post_idx
  ON public.posts USING btree (original_post_id);

CREATE UNIQUE INDEX IF NOT EXISTS posts_plain_repost_unique
  ON public.posts USING btree (author_id, original_post_id)
  WHERE is_repost = true
    AND repost_comment IS NULL
    AND original_post_id IS NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.posts
    ADD CONSTRAINT posts_original_post_id_posts_id_fk
    FOREIGN KEY (original_post_id)
    REFERENCES public.posts(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text varchar(280) NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  deleted_at timestamp
);

CREATE INDEX IF NOT EXISTS post_comments_post_time_idx
  ON public.post_comments USING btree (post_id, created_at);

CREATE INDEX IF NOT EXISTS post_comments_author_time_idx
  ON public.post_comments USING btree (author_id, created_at);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_comments_select_public" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert_own" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_update_own" ON public.post_comments;

CREATE POLICY "post_comments_select_public"
  ON public.post_comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "post_comments_insert_own"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "post_comments_update_own"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION public.create_post_comment(
  p_post_id uuid,
  p_author_id uuid,
  p_text text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id uuid;
  v_text text := btrim(p_text);
BEGIN
  IF p_post_id IS NULL OR p_author_id IS NULL THEN
    RAISE EXCEPTION 'Post id and author id are required';
  END IF;

  IF char_length(v_text) = 0 OR char_length(v_text) > 280 THEN
    RAISE EXCEPTION 'Invalid comment text length';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  INSERT INTO public.post_comments (post_id, author_id, text)
  VALUES (p_post_id, p_author_id, v_text)
  RETURNING id INTO v_comment_id;

  UPDATE public.posts
  SET reply_count = reply_count + 1
  WHERE id = p_post_id;

  RETURN v_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_post_comment(
  p_comment_id uuid,
  p_actor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  SELECT post_id
  INTO v_post_id
  FROM public.post_comments
  WHERE id = p_comment_id
    AND author_id = p_actor_id
    AND deleted_at IS NULL;

  IF v_post_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.post_comments
  SET deleted_at = now()
  WHERE id = p_comment_id;

  UPDATE public.posts
  SET reply_count = GREATEST(0, reply_count - 1)
  WHERE id = v_post_id;

  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.toggle_repost(uuid, uuid);

CREATE OR REPLACE FUNCTION public.toggle_repost(
  p_post_id uuid,
  p_actor_id uuid,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_repost_id uuid;
  v_repost_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
BEGIN
  IF p_post_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Post id and actor id are required';
  END IF;

  IF v_comment IS NOT NULL AND char_length(v_comment) > 280 THEN
    RAISE EXCEPTION 'Invalid repost comment length';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_comment IS NULL THEN
    SELECT id
    INTO v_existing_repost_id
    FROM public.posts
    WHERE author_id = p_actor_id
      AND original_post_id = p_post_id
      AND is_repost = true
      AND repost_comment IS NULL
    LIMIT 1;

    IF v_existing_repost_id IS NOT NULL THEN
      DELETE FROM public.posts WHERE id = v_existing_repost_id;
      UPDATE public.posts
      SET repost_count = GREATEST(0, repost_count - 1)
      WHERE id = p_post_id;
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.posts (author_id, is_repost, original_post_id, repost_comment)
  VALUES (p_actor_id, true, p_post_id, v_comment)
  RETURNING id INTO v_repost_id;

  UPDATE public.posts
  SET repost_count = repost_count + 1
  WHERE id = p_post_id;

  RETURN v_repost_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_comment(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_post_comment(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_repost(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post_comment(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_post_comment(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_repost(uuid, uuid, text) TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
