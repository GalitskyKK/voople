-- Per-member read cursors. The legacy messages.read_at field remains in place
-- for released clients and delivery ticks, but no longer drives unread badges.

CREATE TABLE IF NOT EXISTS public.chat_read_cursors (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_through_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_read_cursors_user_idx
  ON public.chat_read_cursors (user_id, chat_id);

-- Existing accounts start clean. New memberships without a cursor fall back to
-- chat_members.joined_at, so messages from before joining never become unread.
INSERT INTO public.chat_read_cursors (chat_id, user_id, read_through_at, updated_at)
SELECT member.chat_id, member.user_id, now(), now()
FROM public.chat_members AS member
UNION
SELECT section.id, member.user_id, now(), now()
FROM public.chats AS section
JOIN public.chat_members AS member ON member.chat_id = section.parent_chat_id
WHERE section.parent_chat_id IS NOT NULL
ON CONFLICT (chat_id, user_id) DO NOTHING;

ALTER TABLE public.chat_read_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.chat_read_cursors FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_read_cursors TO service_role;

CREATE OR REPLACE FUNCTION public.list_chat_unread_counts(p_user_id uuid)
RETURNS TABLE(chat_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT message.chat_id, count(*)::bigint
  FROM public.messages AS message
  JOIN public.chats AS chat ON chat.id = message.chat_id
  JOIN public.chat_members AS root_member
    ON root_member.chat_id = COALESCE(chat.parent_chat_id, chat.id)
   AND root_member.user_id = p_user_id
  LEFT JOIN public.chat_section_members AS section_member
    ON section_member.chat_id = chat.id
   AND section_member.user_id = p_user_id
  LEFT JOIN public.chat_read_cursors AS cursor
    ON cursor.chat_id = message.chat_id
   AND cursor.user_id = p_user_id
  WHERE message.sender_id <> p_user_id
    AND message.created_at > COALESCE(cursor.read_through_at, root_member.joined_at)
    AND (
      chat.parent_chat_id IS NULL
      OR chat.section_access_mode <> 'restricted'
      OR root_member.role IN ('owner', 'admin')
      OR section_member.user_id IS NOT NULL
    )
  GROUP BY message.chat_id;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_read_cursor(
  p_chat_id uuid,
  p_user_id uuid,
  p_read_through_at timestamp
)
RETURNS timestamp
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parent_chat_id uuid;
  v_section_access_mode text;
  v_role text;
  v_read_through_at timestamp := LEAST(p_read_through_at, now());
BEGIN
  SELECT chat.parent_chat_id, chat.section_access_mode, member.role
  INTO v_parent_chat_id, v_section_access_mode, v_role
  FROM public.chats AS chat
  JOIN public.chat_members AS member
    ON member.chat_id = COALESCE(chat.parent_chat_id, chat.id)
   AND member.user_id = p_user_id
  WHERE chat.id = p_chat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHAT_ACCESS_DENIED';
  END IF;

  IF v_parent_chat_id IS NOT NULL
    AND v_section_access_mode = 'restricted'
    AND v_role NOT IN ('owner', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_section_members
      WHERE chat_id = p_chat_id AND user_id = p_user_id
    ) THEN
    RAISE EXCEPTION 'CHAT_ACCESS_DENIED';
  END IF;

  INSERT INTO public.chat_read_cursors (chat_id, user_id, read_through_at, updated_at)
  VALUES (p_chat_id, p_user_id, v_read_through_at, now())
  ON CONFLICT (chat_id, user_id) DO UPDATE
  SET read_through_at = GREATEST(chat_read_cursors.read_through_at, EXCLUDED.read_through_at),
      updated_at = now()
  RETURNING read_through_at INTO v_read_through_at;

  RETURN v_read_through_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_chat_unread_counts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_chat_read_cursor(uuid, uuid, timestamp) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_unread_counts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_read_cursor(uuid, uuid, timestamp) TO service_role;

COMMENT ON TABLE public.chat_read_cursors IS
  'Per-user chat read cursors. Contains no message text, media URL or credential.';
