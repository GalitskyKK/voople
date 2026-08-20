-- Group-owned custom emoji. Files are normalized server-side before insertion.

CREATE TABLE IF NOT EXISTS public.group_emojis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(32) NOT NULL,
  storage_key varchar(512) NOT NULL,
  animated boolean NOT NULL DEFAULT false,
  rights_confirmed boolean NOT NULL DEFAULT false,
  moderation_status varchar(24) NOT NULL DEFAULT 'automated_approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_emojis_name_check CHECK (name ~ '^[a-z0-9_]{2,32}$'),
  CONSTRAINT group_emojis_chat_name_unique UNIQUE(chat_id, name)
);

CREATE INDEX IF NOT EXISTS group_emojis_chat_idx
  ON public.group_emojis(chat_id, created_at);

ALTER TABLE public.group_emojis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.group_emojis FROM anon, authenticated;
GRANT ALL ON TABLE public.group_emojis TO service_role;

COMMENT ON COLUMN public.group_emojis.rights_confirmed IS
  'Uploader explicitly confirmed ownership or a valid licence for this asset.';
COMMENT ON COLUMN public.group_emojis.moderation_status IS
  'automated_approved, pending, rejected or blocked.';

CREATE OR REPLACE FUNCTION public.register_group_emoji(
  p_id uuid,
  p_chat_id uuid,
  p_user_id uuid,
  p_name varchar,
  p_storage_key varchar,
  p_animated boolean,
  p_rights_confirmed boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  active_boosts integer;
  effective_boosts integer;
  emoji_limit integer;
BEGIN
  IF NOT p_rights_confirmed THEN RAISE EXCEPTION 'rights_confirmation_required'; END IF;
  IF p_name !~ '^[a-z0-9_]{2,32}$' THEN RAISE EXCEPTION 'invalid_emoji_name'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_members member
    JOIN public.chats chat ON chat.id = member.chat_id
    WHERE member.chat_id = p_chat_id AND member.user_id = p_user_id
      AND member.role IN ('owner', 'admin')
      AND chat.type = 'group' AND chat.parent_chat_id IS NULL
  ) THEN RAISE EXCEPTION 'group_admin_required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_chat_id::text, 0));
  SELECT count(*) INTO active_boosts
  FROM public.group_boosts boost
  JOIN public.subscriptions subscription ON subscription.user_id = boost.user_id
  WHERE boost.chat_id = p_chat_id
    AND subscription.expires_at > now() - interval '72 hours';
  SELECT greatest(
    active_boosts,
    CASE WHEN customization.boost_grace_until > now()
      THEN coalesce(customization.boost_grace_level, 0) ELSE 0 END
  ) INTO effective_boosts
  FROM (SELECT 1) singleton
  LEFT JOIN public.group_customization customization ON customization.chat_id = p_chat_id;
  effective_boosts := coalesce(effective_boosts, active_boosts, 0);
  emoji_limit := CASE
    WHEN effective_boosts >= 24 THEN 250
    WHEN effective_boosts >= 12 THEN 150
    WHEN effective_boosts >= 6 THEN 100
    WHEN effective_boosts >= 3 THEN 50
    WHEN effective_boosts >= 1 THEN 20
    ELSE 10
  END;
  IF (SELECT count(*) FROM public.group_emojis WHERE chat_id = p_chat_id) >= emoji_limit
    THEN RAISE EXCEPTION 'group_emoji_limit_reached'; END IF;

  INSERT INTO public.group_emojis(
    id, chat_id, created_by, name, storage_key, animated,
    rights_confirmed, moderation_status, created_at
  ) VALUES (
    p_id, p_chat_id, p_user_id, p_name, p_storage_key, p_animated,
    true, 'automated_approved', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_group_emoji(uuid, uuid, uuid, varchar, varchar, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_group_emoji(uuid, uuid, uuid, varchar, varchar, boolean, boolean)
  TO service_role;
