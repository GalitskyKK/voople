-- Bounded maintenance: preserve reconnect grace, then end empty sessions and
-- archive their temporary Room. Caller is the authenticated server cron only.
CREATE OR REPLACE FUNCTION public.expire_group_room_grace_bounded(
  p_limit integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired integer;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'ROOM_MAINTENANCE_LIMIT_INVALID';
  END IF;

  WITH eligible AS (
    SELECT session.id, room.id AS room_id
    FROM public.live_sessions AS session
    JOIN public.group_rooms AS room ON room.id = session.room_id
    WHERE room.kind = 'temporary'
      AND room.archived_at IS NULL
      AND session.status = 'grace'
      AND session.ended_at IS NULL
      AND session.empty_since <= now() - interval '45 seconds'
      AND NOT EXISTS (
        SELECT 1 FROM public.live_session_participants AS participant
        WHERE participant.session_id = session.id
          AND participant.left_at IS NULL
          AND participant.last_seen_at > now() - interval '120 seconds'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.live_session_guests AS guest
        WHERE guest.live_session_id = session.id
          AND guest.left_at IS NULL
          AND guest.converted_at IS NULL
          AND guest.access_expires_at > now()
          AND guest.last_seen_at > now() - interval '60 seconds'
      )
    ORDER BY session.empty_since, session.id
    LIMIT p_limit
    FOR UPDATE OF room, session SKIP LOCKED
  ), expired AS (
    UPDATE public.live_sessions AS session
    SET status = 'ended', ended_at = now(), updated_at = now()
    FROM eligible
    WHERE session.id = eligible.id
    RETURNING eligible.room_id
  )
  UPDATE public.group_rooms AS room
  SET archived_at = now(), updated_at = now()
  WHERE room.id IN (SELECT room_id FROM expired)
    AND room.archived_at IS NULL;
  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_group_room_grace_bounded(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_group_room_grace_bounded(integer)
  TO service_role;
