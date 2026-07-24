-- Owner-only post deletion with transactional relationship and counter cleanup.

DO $$
BEGIN
  ALTER TABLE public.messages
    DROP CONSTRAINT IF EXISTS messages_shared_post_id_posts_id_fk;
  ALTER TABLE public.messages
    ADD CONSTRAINT messages_shared_post_id_posts_id_fk
    FOREIGN KEY (shared_post_id)
    REFERENCES public.posts(id)
    ON DELETE SET NULL;
END $$;

CREATE OR REPLACE FUNCTION public.delete_own_post(
  p_post_id uuid,
  p_actor_id uuid
)
RETURNS TABLE(media_key text, original_post_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_media_key text;
  v_original_post_id uuid;
  v_hashtags text[];
BEGIN
  SELECT p.author_id, p.media_url, p.original_post_id
  INTO v_author_id, v_media_key, v_original_post_id
  FROM public.posts p
  WHERE p.id = p_post_id
  FOR UPDATE;

  IF v_author_id IS NULL OR v_author_id <> p_actor_id THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  SELECT coalesce(array_agg(ph.hashtag_name), ARRAY[]::text[])
  INTO v_hashtags
  FROM public.post_hashtags ph
  WHERE ph.post_id = p_post_id;

  DELETE FROM public.posts
  WHERE id = p_post_id
    AND author_id = p_actor_id;

  IF v_original_post_id IS NOT NULL THEN
    UPDATE public.posts
    SET repost_count = (
      SELECT count(*)::integer
      FROM public.posts repost
      WHERE repost.original_post_id = v_original_post_id
        AND repost.is_repost = true
    )
    WHERE id = v_original_post_id;
  END IF;

  UPDATE public.hashtags h
  SET post_count = (
    SELECT count(*)::integer
    FROM public.post_hashtags ph
    WHERE ph.hashtag_name = h.name
  )
  WHERE h.name = ANY(v_hashtags);

  RETURN QUERY SELECT v_media_key, v_original_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_post(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_post(uuid, uuid) TO service_role;
