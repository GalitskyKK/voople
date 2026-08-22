-- Boost points are capacity, not automatic unlocks. Selected perks survive a
-- boost loss and become suspended after the grace window instead of being
-- deleted, so configuration can recover when capacity returns.

CREATE TABLE IF NOT EXISTS public.group_perk_allocations (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  perk_id varchar(40) NOT NULL,
  enabled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, perk_id),
  CONSTRAINT group_perk_allocations_known_perk CHECK (perk_id IN (
    'animated_icon', 'emoji_sound', 'animated_banner', 'uploads',
    'vanity', 'roles', 'hd'
  ))
);

CREATE INDEX IF NOT EXISTS group_perk_allocations_chat_time_idx
  ON public.group_perk_allocations(chat_id, enabled_at);

ALTER TABLE public.group_perk_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.group_perk_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_perk_allocations TO service_role;

COMMENT ON TABLE public.group_perk_allocations IS
  'Persisted Boost perk selection. Effective active/suspended state is calculated from current/grace capacity.';

CREATE OR REPLACE FUNCTION public.group_effective_boost_capacity(p_chat_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT greatest(
    (SELECT count(*)::integer FROM public.group_boosts boost
      JOIN public.subscriptions subscription ON subscription.user_id = boost.user_id
      WHERE boost.chat_id = p_chat_id AND subscription.expires_at > now() - interval '72 hours'),
    coalesce((SELECT CASE WHEN boost_grace_until > now() THEN boost_grace_level ELSE 0 END
      FROM public.group_customization WHERE chat_id = p_chat_id), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.group_perk_is_active(p_chat_id uuid, p_perk_id varchar)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH catalog(perk_id, cost, milestone, priority) AS (VALUES
    ('animated_icon'::varchar, 1, 3, 1),
    ('emoji_sound'::varchar, 1, 3, 2),
    ('animated_banner'::varchar, 2, 6, 3),
    ('uploads'::varchar, 3, 6, 4),
    ('vanity'::varchar, 2, 24, 5),
    ('roles'::varchar, 2, 24, 6),
    ('hd'::varchar, 3, 24, 7)
  ), selected AS (
    SELECT catalog.* FROM catalog
    JOIN public.group_perk_allocations allocation
      ON allocation.chat_id = p_chat_id AND allocation.perk_id = catalog.perk_id
  ), target AS (
    SELECT * FROM catalog WHERE perk_id = p_perk_id
  ), capacity AS (
    SELECT public.group_effective_boost_capacity(p_chat_id) AS value
  )
  SELECT coalesce(
    (SELECT capacity.value >= target.milestone
      AND (SELECT coalesce(sum(selected.cost), 0) FROM selected WHERE selected.priority <= target.priority) <= capacity.value
      AND EXISTS (SELECT 1 FROM selected WHERE selected.perk_id = target.perk_id)
    FROM target CROSS JOIN capacity),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.group_effective_boost_capacity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.group_perk_is_active(uuid, varchar) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.group_effective_boost_capacity(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.group_perk_is_active(uuid, varchar) TO service_role;

CREATE OR REPLACE FUNCTION public.register_group_emoji(
  p_id uuid, p_chat_id uuid, p_user_id uuid, p_name varchar,
  p_storage_key varchar, p_animated boolean, p_rights_confirmed boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE effective_boosts integer; emoji_limit integer;
BEGIN
  IF NOT p_rights_confirmed THEN RAISE EXCEPTION 'rights_confirmation_required'; END IF;
  IF p_name !~ '^[a-z0-9_]{2,32}$' THEN RAISE EXCEPTION 'invalid_emoji_name'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_members member JOIN public.chats chat ON chat.id = member.chat_id
    WHERE member.chat_id = p_chat_id AND member.user_id = p_user_id
      AND member.role IN ('owner', 'admin') AND chat.type = 'group' AND chat.parent_chat_id IS NULL
  ) THEN RAISE EXCEPTION 'group_admin_required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_chat_id::text, 0));
  effective_boosts := public.group_effective_boost_capacity(p_chat_id);
  IF public.group_perk_is_active(p_chat_id, 'emoji_sound') THEN
    emoji_limit := CASE WHEN effective_boosts >= 24 THEN 250 WHEN effective_boosts >= 12 THEN 150
      WHEN effective_boosts >= 6 THEN 100 WHEN effective_boosts >= 3 THEN 50 ELSE 10 END;
  ELSE emoji_limit := 10; END IF;
  IF (SELECT count(*) FROM public.group_emojis WHERE chat_id = p_chat_id) >= emoji_limit
    THEN RAISE EXCEPTION 'group_emoji_limit_reached'; END IF;
  INSERT INTO public.group_emojis(id, chat_id, created_by, name, storage_key, animated,
    rights_confirmed, moderation_status, created_at)
  VALUES (p_id, p_chat_id, p_user_id, p_name, p_storage_key, p_animated,
    true, 'automated_approved', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.register_group_sound(
  p_id uuid, p_chat_id uuid, p_user_id uuid, p_name varchar,
  p_storage_key varchar, p_duration_ms integer, p_rights_confirmed boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE effective_boosts integer; sound_limit integer;
BEGIN
  IF NOT p_rights_confirmed THEN RAISE EXCEPTION 'rights_confirmation_required'; END IF;
  IF p_duration_ms < 200 OR p_duration_ms > 10000 THEN RAISE EXCEPTION 'invalid_sound_duration'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_members member JOIN public.chats chat ON chat.id = member.chat_id
    WHERE member.chat_id = p_chat_id AND member.user_id = p_user_id
      AND member.role IN ('owner', 'admin') AND chat.type = 'group' AND chat.parent_chat_id IS NULL
  ) THEN RAISE EXCEPTION 'group_admin_required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_chat_id::text, 1));
  IF NOT public.group_perk_is_active(p_chat_id, 'emoji_sound')
    THEN RAISE EXCEPTION 'group_sound_level_required'; END IF;
  effective_boosts := public.group_effective_boost_capacity(p_chat_id);
  sound_limit := CASE WHEN effective_boosts >= 24 THEN 48 WHEN effective_boosts >= 12 THEN 32
    WHEN effective_boosts >= 6 THEN 16 WHEN effective_boosts >= 3 THEN 8 ELSE 0 END;
  IF (SELECT count(*) FROM public.group_sounds WHERE chat_id = p_chat_id) >= sound_limit
    THEN RAISE EXCEPTION 'group_sound_limit_reached'; END IF;
  INSERT INTO public.group_sounds(id, chat_id, created_by, name, storage_key, duration_ms,
    rights_confirmed, moderation_status, created_at)
  VALUES (p_id, p_chat_id, p_user_id, p_name, p_storage_key, p_duration_ms,
    true, 'automated_approved', now());
END;
$$;
