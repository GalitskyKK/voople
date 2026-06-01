-- Quote reposts and direct repost counters.

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

  -- Plain repost is a toggle for the exact post being reposted.
  -- Quote reposts are new posts and are not toggled off.
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

REVOKE ALL ON FUNCTION public.toggle_repost(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_repost(uuid, uuid, text) TO service_role;
