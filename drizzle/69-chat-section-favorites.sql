-- Per-user shortcuts for up to two accessible Sections in each Group.

CREATE TABLE IF NOT EXISTS public.user_chat_section_favorites (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section_id),
  CONSTRAINT user_chat_section_favorites_user_group_position_unique
    UNIQUE (user_id, group_id, position),
  CONSTRAINT user_chat_section_favorites_group_membership_fk
    FOREIGN KEY (group_id, user_id)
    REFERENCES public.chat_members(chat_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT user_chat_section_favorites_position_check CHECK (position BETWEEN 1 AND 2)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS user_chat_section_favorites_group_idx
  ON public.user_chat_section_favorites (user_id, group_id, position);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.enforce_chat_section_favorite_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent_chat_id uuid;
  v_access_mode text;
  v_role text;
BEGIN
  SELECT section.parent_chat_id, section.section_access_mode, member.role
  INTO v_parent_chat_id, v_access_mode, v_role
  FROM public.chats AS section
  JOIN public.chat_members AS member
    ON member.chat_id = section.parent_chat_id
   AND member.user_id = NEW.user_id
  WHERE section.id = NEW.section_id;

  IF NOT FOUND OR v_parent_chat_id IS NULL OR v_parent_chat_id <> NEW.group_id THEN
    RAISE EXCEPTION 'CHAT_SECTION_FAVORITE_ACCESS_DENIED';
  END IF;

  IF v_access_mode = 'restricted'
    AND v_role NOT IN ('owner', 'admin')
    AND NOT EXISTS (
      SELECT 1
      FROM public.chat_section_members
      WHERE chat_id = NEW.section_id AND user_id = NEW.user_id
    ) THEN
    RAISE EXCEPTION 'CHAT_SECTION_FAVORITE_ACCESS_DENIED';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS user_chat_section_favorites_access_guard
  ON public.user_chat_section_favorites;
CREATE TRIGGER user_chat_section_favorites_access_guard
BEFORE INSERT OR UPDATE OF user_id, group_id, section_id
ON public.user_chat_section_favorites
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chat_section_favorite_access();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.toggle_chat_section_favorite(
  p_user_id uuid,
  p_section_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_group_id uuid;
  v_access_mode text;
  v_role text;
  v_position smallint;
BEGIN
  SELECT section.parent_chat_id, section.section_access_mode, member.role
  INTO v_group_id, v_access_mode, v_role
  FROM public.chats AS section
  JOIN public.chat_members AS member
    ON member.chat_id = section.parent_chat_id
   AND member.user_id = p_user_id
  WHERE section.id = p_section_id;

  IF NOT FOUND OR v_group_id IS NULL THEN
    RAISE EXCEPTION 'CHAT_SECTION_FAVORITE_ACCESS_DENIED';
  END IF;

  IF v_access_mode = 'restricted'
    AND v_role NOT IN ('owner', 'admin')
    AND NOT EXISTS (
      SELECT 1
      FROM public.chat_section_members
      WHERE chat_id = p_section_id AND user_id = p_user_id
    ) THEN
    RAISE EXCEPTION 'CHAT_SECTION_FAVORITE_ACCESS_DENIED';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || v_group_id::text, 0)
  );

  IF v_role = 'member' THEN
    DELETE FROM public.user_chat_section_favorites AS favorite
    USING public.chats AS section
    WHERE favorite.user_id = p_user_id
      AND favorite.group_id = v_group_id
      AND section.id = favorite.section_id
      AND section.section_access_mode = 'restricted'
      AND NOT EXISTS (
        SELECT 1
        FROM public.chat_section_members AS section_member
        WHERE section_member.chat_id = favorite.section_id
          AND section_member.user_id = p_user_id
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_chat_section_favorites
    WHERE user_id = p_user_id AND section_id = p_section_id
  ) THEN
    DELETE FROM public.user_chat_section_favorites
    WHERE user_id = p_user_id AND section_id = p_section_id;
    RETURN false;
  END IF;

  SELECT slot::smallint
  INTO v_position
  FROM generate_series(1, 2) AS slot
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_chat_section_favorites AS favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.group_id = v_group_id
      AND favorite.position = slot
  )
  ORDER BY slot
  LIMIT 1;

  IF v_position IS NULL THEN
    RAISE EXCEPTION 'CHAT_SECTION_FAVORITE_LIMIT';
  END IF;

  INSERT INTO public.user_chat_section_favorites (
    user_id, group_id, section_id, position
  ) VALUES (
    p_user_id, v_group_id, p_section_id, v_position
  );

  RETURN true;
END;
$$;
--> statement-breakpoint

ALTER TABLE public.user_chat_section_favorites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.user_chat_section_favorites FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE public.user_chat_section_favorites TO service_role;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_chat_section_favorite_access() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.toggle_chat_section_favorite(uuid, uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.enforce_chat_section_favorite_access() TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.toggle_chat_section_favorite(uuid, uuid) TO service_role;
--> statement-breakpoint

COMMENT ON TABLE public.user_chat_section_favorites IS
  'Per-user Group Section shortcuts; contains no message content or credentials.';
