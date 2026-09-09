-- Owner-only Saved Messages storage. This is intentionally not represented as
-- a direct chat, a second user or a group membership.

CREATE TABLE IF NOT EXISTS public.saved_messages (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text varchar(1000),
  content jsonb,
  media_url varchar(500),
  media_title varchar(100),
  media_artist varchar(100),
  shared_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  shared_track_id uuid REFERENCES public.playlist_tracks(id) ON DELETE SET NULL,
  reply_to_message_id uuid REFERENCES public.saved_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT saved_messages_payload_check CHECK (
    NULLIF(btrim(text), '') IS NOT NULL
    OR content IS NOT NULL
    OR media_url IS NOT NULL
    OR shared_post_id IS NOT NULL
    OR shared_track_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS saved_messages_owner_time_idx
  ON public.saved_messages(owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS saved_messages_search_idx
  ON public.saved_messages
  USING gin (to_tsvector('simple', COALESCE(text, '')));

CREATE OR REPLACE FUNCTION public.enforce_saved_message_reply_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reply_owner_id uuid;
BEGIN
  IF NEW.reply_to_message_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT owner_id
  INTO v_reply_owner_id
  FROM public.saved_messages
  WHERE id = NEW.reply_to_message_id;

  IF v_reply_owner_id IS NULL OR v_reply_owner_id <> NEW.owner_id THEN
    RAISE EXCEPTION 'SAVED_MESSAGE_REPLY_UNAVAILABLE';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_messages_reply_owner_guard
  ON public.saved_messages;
CREATE TRIGGER saved_messages_reply_owner_guard
BEFORE INSERT OR UPDATE OF owner_id, reply_to_message_id
ON public.saved_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_saved_message_reply_owner();

ALTER TABLE public.saved_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.saved_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.saved_messages TO service_role;
REVOKE ALL ON FUNCTION public.enforce_saved_message_reply_owner()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_saved_message_reply_owner()
  TO service_role;

COMMENT ON TABLE public.saved_messages IS
  'Owner-only Saved Messages; excluded from chat membership, recommendations and social analytics.';
