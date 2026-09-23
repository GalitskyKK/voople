-- Archive a Room only after checking the same fresh participant/guest presence
-- shown by Group Now. The Lobby is permanent and cannot be archived.

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
  v_now timestamp := now();
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

  -- Guest entry locks its LiveSession, so lock it before testing presence.
  PERFORM 1 FROM public.live_sessions
  WHERE room_id = p_room_id AND ended_at IS NULL
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.live_sessions AS session
    JOIN public.live_session_participants AS participant
      ON participant.session_id = session.id
     AND participant.left_at IS NULL
     AND participant.last_seen_at > v_now - interval '120 seconds'
    WHERE session.room_id = p_room_id
      AND session.ended_at IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM public.live_sessions AS session
    JOIN public.live_session_guests AS guest
      ON guest.live_session_id = session.id
     AND guest.left_at IS NULL
     AND guest.converted_at IS NULL
     AND guest.access_expires_at > v_now
     AND guest.last_seen_at > v_now - interval '60 seconds'
    WHERE session.room_id = p_room_id
      AND session.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ROOM_NOT_EMPTY';
  END IF;

  UPDATE public.live_session_participants AS participant
  SET left_at = v_now
  FROM public.live_sessions AS session
  WHERE participant.session_id = session.id
    AND session.room_id = p_room_id
    AND session.ended_at IS NULL
    AND participant.left_at IS NULL;

  UPDATE public.live_session_guests AS guest
  SET left_at = v_now
  FROM public.live_sessions AS session
  WHERE guest.live_session_id = session.id
    AND session.room_id = p_room_id
    AND session.ended_at IS NULL
    AND guest.left_at IS NULL;

  UPDATE public.live_sessions
  SET status = 'ended',
      ended_at = v_now,
      updated_at = v_now
  WHERE room_id = p_room_id
    AND ended_at IS NULL;

  UPDATE public.group_rooms
  SET archived_at = v_now,
      updated_at = v_now
  WHERE id = p_room_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_group_room(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_group_room(uuid, uuid)
  TO service_role;
