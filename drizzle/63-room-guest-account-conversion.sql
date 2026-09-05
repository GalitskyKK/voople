-- Explicit Room Guest -> account conversion.
-- A Room link remains Room-only. Permanent Group access is granted only when
-- the link creator is still a Group administrator, or the Group itself allows
-- open joining. Request-based Groups receive a normal moderated join request.

CREATE OR REPLACE FUNCTION public.convert_room_guest_account(
  p_access_token_hash char(64),
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_guest public.live_session_guests%ROWTYPE;
  v_invite public.room_guest_invites%ROWTYPE;
  v_session public.live_sessions%ROWTYPE;
  v_group public.chats%ROWTYPE;
  v_creator_role varchar(20);
  v_member_count integer;
  v_status text := 'account_linked';
BEGIN
  IF p_access_token_hash !~ '^[0-9a-f]{64}$' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_GUEST_CONVERSION_INVALID';
  END IF;

  SELECT * INTO v_guest
  FROM public.live_session_guests
  WHERE access_token_hash = p_access_token_hash
    AND access_expires_at > v_now
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_GUEST_CONVERSION_UNAVAILABLE';
  END IF;
  IF v_guest.converted_user_id IS NOT NULL
    AND v_guest.converted_user_id <> p_user_id THEN
    RAISE EXCEPTION 'ROOM_GUEST_CONVERSION_CLAIMED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'ROOM_GUEST_CONVERSION_USER_MISSING';
  END IF;

  SELECT * INTO v_invite
  FROM public.room_guest_invites
  WHERE id = v_guest.invite_id;
  SELECT * INTO v_session
  FROM public.live_sessions
  WHERE id = v_guest.live_session_id
    AND kind = 'group_room';
  SELECT chat.* INTO v_group
  FROM public.chats AS chat
  JOIN public.group_rooms AS room
    ON room.group_chat_id = chat.id
   AND room.id = v_session.room_id
  WHERE chat.id = v_session.conversation_id
    AND chat.type = 'group'
    AND chat.parent_chat_id IS NULL;

  IF v_invite.id IS NULL OR v_session.id IS NULL OR v_group.id IS NULL THEN
    RAISE EXCEPTION 'ROOM_GUEST_CONVERSION_UNAVAILABLE';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_group.id::text, 917));

  IF EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = v_group.id AND user_id = p_user_id
  ) THEN
    v_status := 'already_joined';
  ELSE
    SELECT role INTO v_creator_role
    FROM public.chat_members
    WHERE chat_id = v_group.id AND user_id = v_invite.created_by;

    IF v_creator_role IN ('owner', 'admin')
      OR (
        v_group.group_visibility IN ('public', 'unlisted')
        AND v_group.join_policy = 'open'
      ) THEN
      SELECT count(*) INTO v_member_count
      FROM public.chat_members
      WHERE chat_id = v_group.id;
      IF v_member_count >= 20 THEN
        RAISE EXCEPTION 'ROOM_GUEST_CONVERSION_GROUP_FULL';
      END IF;
      INSERT INTO public.chat_members (chat_id, user_id, role)
      VALUES (v_group.id, p_user_id, 'member')
      ON CONFLICT DO NOTHING;
      v_status := 'joined';
    ELSIF v_group.group_visibility IN ('public', 'unlisted')
      AND v_group.join_policy = 'request' THEN
      INSERT INTO public.group_join_requests (chat_id, user_id)
      VALUES (v_group.id, p_user_id)
      ON CONFLICT (chat_id, user_id) WHERE status = 'pending' DO NOTHING;
      v_status := 'requested';
    END IF;
  END IF;

  UPDATE public.live_session_guests
  SET converted_user_id = p_user_id,
      converted_at = COALESCE(converted_at, v_now),
      left_at = COALESCE(left_at, v_now),
      last_seen_at = v_now,
      mic_muted = true
  WHERE id = v_guest.id;

  RETURN jsonb_build_object(
    'status', v_status,
    'groupId', v_group.id,
    'groupName', COALESCE(NULLIF(btrim(v_group.name), ''), 'Группа')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_room_guest_account(char, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_room_guest_account(char, uuid)
  TO service_role;

COMMENT ON FUNCTION public.convert_room_guest_account(char, uuid) IS
  'Explicitly binds a Room guest to an authenticated user and applies existing Group invitation policy.';
