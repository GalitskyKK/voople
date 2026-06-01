-- Comment media attachments + extended create_post_comment RPC.
-- Apply in Supabase SQL Editor after 12-shop-currency.sql.

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS media_url varchar(500),
  ADD COLUMN IF NOT EXISTS media_type post_media_type;

ALTER TABLE public.post_comments
  ALTER COLUMN text DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_post_comment(
  p_post_id uuid,
  p_author_id uuid,
  p_text text,
  p_media_url text DEFAULT NULL,
  p_media_type post_media_type DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id uuid;
  v_text text := coalesce(btrim(p_text), '');
BEGIN
  IF p_post_id IS NULL OR p_author_id IS NULL THEN
    RAISE EXCEPTION 'Post id and author id are required';
  END IF;

  IF char_length(v_text) = 0 AND p_media_url IS NULL THEN
    RAISE EXCEPTION 'Comment text or media is required';
  END IF;

  IF char_length(v_text) > 280 THEN
    RAISE EXCEPTION 'Invalid comment text length';
  END IF;

  IF p_media_url IS NOT NULL AND p_media_type IS NULL THEN
    RAISE EXCEPTION 'Media type is required when media is attached';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  INSERT INTO public.post_comments (post_id, author_id, text, media_url, media_type)
  VALUES (p_post_id, p_author_id, NULLIF(v_text, ''), p_media_url, p_media_type)
  RETURNING id INTO v_comment_id;

  UPDATE public.posts
  SET reply_count = reply_count + 1
  WHERE id = p_post_id;

  RETURN v_comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_comment(uuid, uuid, text, text, post_media_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post_comment(uuid, uuid, text, text, post_media_type) TO service_role;
