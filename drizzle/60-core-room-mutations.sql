-- Atomic mutation contract for the internal multi-room rollout.
-- Public clients cannot call these functions; the server validates the actor
-- and invokes them with the service-role connection.

CREATE OR REPLACE FUNCTION public.create_group_room(
  p_group_chat_id uuid,
  p_user_id uuid,
  p_kind varchar,
  p_name varchar
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role varchar;
  v_room public.group_rooms%ROWTYPE;
BEGIN
  IF p_kind NOT IN ('temporary', 'pinned') THEN
    RAISE EXCEPTION 'ROOM_KIND_INVALID';
  END IF;
  IF length(btrim(p_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'ROOM_NAME_INVALID';
  END IF;

  SELECT member.role
  INTO v_role
  FROM public.chats AS chat
  JOIN public.chat_members AS member
    ON member.chat_id = chat.id
   AND member.user_id = p_user_id
  WHERE chat.id = p_group_chat_id
    AND chat.type = 'group'
    AND chat.parent_chat_id IS NULL;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'ROOM_FORBIDDEN';
  END IF;
  IF p_kind = 'pinned' AND v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'ROOM_FORBIDDEN';
  END IF;

  INSERT INTO public.group_rooms (
    group_chat_id,
    kind,
    name,
    created_by
  ) VALUES (
    p_group_chat_id,
    p_kind,
    btrim(p_name),
    p_user_id
  )
  RETURNING * INTO v_room;

  RETURN jsonb_build_object(
    'id', v_room.id,
    'groupId', v_room.group_chat_id,
    'kind', v_room.kind,
    'name', v_room.name,
    'createdBy', v_room.created_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_group_room_kind(
  p_room_id uuid,
  p_user_id uuid,
  p_kind varchar
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room public.group_rooms%ROWTYPE;
  v_role varchar;
BEGIN
  IF p_kind NOT IN ('temporary', 'pinned') THEN
    RAISE EXCEPTION 'ROOM_KIND_INVALID';
  END IF;

  SELECT * INTO v_room
  FROM public.group_rooms
  WHERE id = p_room_id
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR v_room.kind = 'lobby' THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  SELECT role INTO v_role
  FROM public.chat_members
  WHERE chat_id = v_room.group_chat_id
    AND user_id = p_user_id;
  IF v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'ROOM_FORBIDDEN';
  END IF;

  UPDATE public.group_rooms
  SET kind = p_kind,
      updated_at = now()
  WHERE id = p_room_id
  RETURNING * INTO v_room;

  RETURN jsonb_build_object(
    'id', v_room.id,
    'groupId', v_room.group_chat_id,
    'kind', v_room.kind,
    'name', v_room.name,
    'createdBy', v_room.created_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_group_room(
  p_room_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room public.group_rooms%ROWTYPE;
  v_role varchar;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_room_id::text, 912));

  SELECT * INTO v_room
  FROM public.group_rooms
  WHERE id = p_room_id
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR v_room.kind = 'lobby' THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  SELECT role INTO v_role
  FROM public.chat_members
  WHERE chat_id = v_room.group_chat_id
    AND user_id = p_user_id;
  IF v_role IS NULL OR (
    v_role NOT IN ('owner', 'admin')
    AND NOT (v_room.kind = 'temporary' AND v_room.created_by = p_user_id)
  ) THEN
    RAISE EXCEPTION 'ROOM_FORBIDDEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.live_sessions AS session
    JOIN public.live_session_participants AS participant
      ON participant.session_id = session.id
     AND participant.left_at IS NULL
    WHERE session.room_id = p_room_id
      AND session.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ROOM_NOT_EMPTY';
  END IF;

  UPDATE public.live_sessions
  SET status = 'ended',
      ended_at = now(),
      updated_at = now()
  WHERE room_id = p_room_id
    AND ended_at IS NULL;

  UPDATE public.group_rooms
  SET archived_at = now(),
      updated_at = now()
  WHERE id = p_room_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group_room(
  p_room_id uuid,
  p_user_id uuid,
  p_mic_muted boolean DEFAULT true,
  p_allow_cross_context boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamp := now();
  v_room public.group_rooms%ROWTYPE;
  v_target_session public.live_sessions%ROWTYPE;
  v_current_session public.live_sessions%ROWTYPE;
  v_current_room public.group_rooms%ROWTYPE;
  v_current_session_id uuid;
  v_previous_session_id uuid;
  v_legacy_chat_id uuid;
  v_legacy_context_id uuid;
  v_legacy_type varchar;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 911));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_room_id::text, 912));

  SELECT * INTO v_room
  FROM public.group_rooms
  WHERE id = p_room_id
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.chat_members
    WHERE chat_id = v_room.group_chat_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'ROOM_FORBIDDEN';
  END IF;

  SELECT participant.session_id
  INTO v_current_session_id
  FROM public.live_session_participants AS participant
  WHERE participant.user_id = p_user_id
    AND participant.left_at IS NULL
  LIMIT 1
  FOR UPDATE;

  IF v_current_session_id IS NOT NULL THEN
    SELECT * INTO v_current_session
    FROM public.live_sessions
    WHERE id = v_current_session_id
    FOR UPDATE;

    IF v_current_session.room_id = p_room_id THEN
      UPDATE public.live_session_participants AS participant
      SET mic_muted = p_mic_muted,
          last_seen_at = v_now
      WHERE participant.session_id = v_current_session.id
        AND participant.user_id = p_user_id;
      UPDATE public.live_sessions
      SET status = 'active',
          empty_since = NULL,
          updated_at = v_now
      WHERE id = v_current_session.id;
      RETURN jsonb_build_object(
        'roomId', p_room_id,
        'sessionId', v_current_session.id,
        'providerSessionId', v_current_session.provider_session_id,
        'previousSessionId', NULL,
        'switched', false
      );
    END IF;

    IF v_current_session.room_id IS NOT NULL THEN
      SELECT * INTO v_current_room
      FROM public.group_rooms
      WHERE id = v_current_session.room_id;
    END IF;
    IF (
      COALESCE(v_current_room.group_chat_id, v_current_session.conversation_id)
      <> v_room.group_chat_id
      AND NOT p_allow_cross_context
    ) THEN
      RAISE EXCEPTION 'ROOM_CONTEXT_CONFIRMATION_REQUIRED';
    END IF;

    v_previous_session_id := v_current_session.id;
    UPDATE public.live_session_participants AS participant
    SET left_at = v_now,
        last_seen_at = v_now
    WHERE participant.session_id = v_current_session.id
      AND participant.user_id = p_user_id
      AND participant.left_at IS NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM public.live_session_participants AS participant
      WHERE participant.session_id = v_current_session.id
        AND participant.left_at IS NULL
    ) THEN
      IF v_current_session.kind = 'group_room' AND v_current_room.kind = 'temporary' THEN
        UPDATE public.live_sessions
        SET status = 'grace', empty_since = v_now, updated_at = v_now
        WHERE id = v_current_session.id;
      ELSE
        UPDATE public.live_sessions
        SET status = 'ended', ended_at = v_now, empty_since = v_now, updated_at = v_now
        WHERE id = v_current_session.id;
      END IF;
    END IF;
  END IF;

  SELECT participant.chat_id,
         COALESCE(chat.parent_chat_id, chat.id),
         chat.type
  INTO v_legacy_chat_id, v_legacy_context_id, v_legacy_type
  FROM public.chat_room_participants AS participant
  JOIN public.chats AS chat ON chat.id = participant.chat_id
  WHERE participant.user_id = p_user_id
  LIMIT 1
  FOR UPDATE OF participant;

  IF v_legacy_chat_id IS NOT NULL THEN
    IF (
      (v_legacy_type = 'direct' OR v_legacy_context_id <> v_room.group_chat_id)
      AND NOT p_allow_cross_context
    ) THEN
      RAISE EXCEPTION 'ROOM_CONTEXT_CONFIRMATION_REQUIRED';
    END IF;
    DELETE FROM public.chat_room_participants
    WHERE user_id = p_user_id;
    UPDATE public.chat_rooms AS legacy_room
    SET status = 'ended', ended_at = v_now, updated_at = v_now
    WHERE legacy_room.chat_id = v_legacy_chat_id
      AND legacy_room.status IN ('active', 'ringing')
      AND NOT EXISTS (
        SELECT 1
        FROM public.chat_room_participants AS participant
        WHERE participant.chat_id = legacy_room.chat_id
      );
  END IF;

  SELECT * INTO v_target_session
  FROM public.live_sessions
  WHERE room_id = p_room_id
    AND ended_at IS NULL
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.live_sessions (
      conversation_id,
      room_id,
      kind,
      status,
      started_by
    ) VALUES (
      v_room.group_chat_id,
      v_room.id,
      'group_room',
      'active',
      p_user_id
    )
    RETURNING * INTO v_target_session;
  ELSE
    UPDATE public.live_sessions
    SET status = 'active',
        empty_since = NULL,
        updated_at = v_now
    WHERE id = v_target_session.id
    RETURNING * INTO v_target_session;
  END IF;

  INSERT INTO public.live_session_participants (
    session_id,
    user_id,
    mic_muted,
    joined_at,
    last_seen_at,
    left_at
  ) VALUES (
    v_target_session.id,
    p_user_id,
    p_mic_muted,
    v_now,
    v_now,
    NULL
  )
  ON CONFLICT (session_id, user_id)
  DO UPDATE SET
    mic_muted = EXCLUDED.mic_muted,
    camera_enabled = false,
    screen_sharing = false,
    joined_at = EXCLUDED.joined_at,
    last_seen_at = EXCLUDED.last_seen_at,
    left_at = NULL;

  RETURN jsonb_build_object(
    'roomId', v_room.id,
    'sessionId', v_target_session.id,
    'providerSessionId', v_target_session.provider_session_id,
    'previousSessionId', v_previous_session_id,
    'switched', v_previous_session_id IS NOT NULL OR v_legacy_chat_id IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_live_session(
  p_user_id uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamp := now();
  v_session public.live_sessions%ROWTYPE;
  v_room public.group_rooms%ROWTYPE;
  v_status varchar;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 911));

  SELECT session.* INTO v_session
  FROM public.live_session_participants AS participant
  JOIN public.live_sessions AS session ON session.id = participant.session_id
  WHERE participant.user_id = p_user_id
    AND participant.left_at IS NULL
    AND (p_session_id IS NULL OR participant.session_id = p_session_id)
  LIMIT 1
  FOR UPDATE OF participant, session;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'left', false,
      'sessionId', NULL,
      'roomId', NULL,
      'sessionStatus', NULL
    );
  END IF;

  UPDATE public.live_session_participants AS participant
  SET left_at = v_now,
      last_seen_at = v_now
  WHERE participant.session_id = v_session.id
    AND participant.user_id = p_user_id
    AND participant.left_at IS NULL;

  v_status := v_session.status;
  IF NOT EXISTS (
    SELECT 1
    FROM public.live_session_participants AS participant
    WHERE participant.session_id = v_session.id
      AND participant.left_at IS NULL
  ) THEN
    IF v_session.room_id IS NOT NULL THEN
      SELECT * INTO v_room
      FROM public.group_rooms
      WHERE id = v_session.room_id;
    END IF;
    IF v_session.kind = 'group_room' AND v_room.kind = 'temporary' THEN
      v_status := 'grace';
      UPDATE public.live_sessions
      SET status = 'grace', empty_since = v_now, updated_at = v_now
      WHERE id = v_session.id;
    ELSE
      v_status := 'ended';
      UPDATE public.live_sessions
      SET status = 'ended', ended_at = v_now, empty_since = v_now, updated_at = v_now
      WHERE id = v_session.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'left', true,
    'sessionId', v_session.id,
    'roomId', v_session.room_id,
    'sessionStatus', v_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_live_session(
  p_user_id uuid,
  p_session_id uuid,
  p_mic_muted boolean,
  p_camera_enabled boolean,
  p_screen_sharing boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.live_session_participants AS participant
  SET mic_muted = p_mic_muted,
      camera_enabled = p_camera_enabled,
      screen_sharing = p_screen_sharing,
      last_seen_at = now()
  WHERE participant.user_id = p_user_id
    AND participant.session_id = p_session_id
    AND participant.left_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_group_room_grace(
  p_before timestamp DEFAULT now() - interval '45 seconds'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired integer;
BEGIN
  WITH expired AS (
    UPDATE public.live_sessions AS session
    SET status = 'ended',
        ended_at = now(),
        updated_at = now()
    FROM public.group_rooms AS room
    WHERE session.room_id = room.id
      AND room.kind = 'temporary'
      AND session.status = 'grace'
      AND session.ended_at IS NULL
      AND session.empty_since <= p_before
      AND NOT EXISTS (
        SELECT 1
        FROM public.live_session_participants AS participant
        WHERE participant.session_id = session.id
          AND participant.left_at IS NULL
      )
    RETURNING room.id
  )
  UPDATE public.group_rooms AS room
  SET archived_at = now(),
      updated_at = now()
  WHERE room.id IN (SELECT id FROM expired)
    AND room.archived_at IS NULL;
  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_room(uuid, uuid, varchar, varchar)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_group_room_kind(uuid, uuid, varchar)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_group_room(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_group_room(uuid, uuid, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_live_session(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_live_session(uuid, uuid, boolean, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_group_room_grace(timestamp)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_group_room(uuid, uuid, varchar, varchar)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_group_room_kind(uuid, uuid, varchar)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_group_room(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.join_group_room(uuid, uuid, boolean, boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_live_session(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_live_session(uuid, uuid, boolean, boolean, boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_group_room_grace(timestamp)
  TO service_role;
