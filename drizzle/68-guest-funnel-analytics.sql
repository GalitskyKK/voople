-- Idempotency for privacy-safe server product events.
-- Values are HMAC-SHA256 digests produced by the application; raw invite,
-- guest, user, request and media identifiers are never stored here.

ALTER TABLE public.client_telemetry_events
  ADD COLUMN IF NOT EXISTS dedupe_key varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS client_telemetry_server_event_dedupe_idx
  ON public.client_telemetry_events (event_name, dedupe_key);

COMMENT ON COLUMN public.client_telemetry_events.dedupe_key IS
  'Optional HMAC digest used to make server product milestones idempotent.';

CREATE OR REPLACE FUNCTION public.room_guest_invite_audience(
  p_invite_token_hash char(64),
  p_user_id uuid
)
RETURNS varchar
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM public.room_guest_invites AS invite
    JOIN public.live_sessions AS session ON session.id = invite.live_session_id
    JOIN public.chat_members AS member
      ON member.chat_id = session.conversation_id
     AND member.user_id = p_user_id
    WHERE invite.token_hash = p_invite_token_hash
  ) THEN 'member' ELSE 'existing' END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_room_guest_v2(
  p_access_token_hash char(64),
  p_mic_muted boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_guest public.live_session_guests%ROWTYPE;
  v_has_peer boolean := false;
BEGIN
  UPDATE public.live_session_guests AS guest
  SET mic_muted = p_mic_muted,
      last_seen_at = v_now
  FROM public.live_sessions AS session
  WHERE guest.access_token_hash = p_access_token_hash
    AND guest.live_session_id = session.id
    AND guest.left_at IS NULL
    AND guest.converted_at IS NULL
    AND guest.access_expires_at > v_now
    AND session.status IN ('connecting', 'active', 'grace')
    AND session.ended_at IS NULL
  RETURNING guest.* INTO v_guest;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.live_session_participants AS participant
    WHERE participant.session_id = v_guest.live_session_id
      AND participant.left_at IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM public.live_session_guests AS peer
    WHERE peer.live_session_id = v_guest.live_session_id
      AND peer.id <> v_guest.id
      AND peer.left_at IS NULL
      AND peer.converted_at IS NULL
      AND peer.access_expires_at > v_now
      AND peer.last_seen_at > v_now - interval '60 seconds'
  ) INTO v_has_peer;

  RETURN jsonb_build_object(
    'ok', true,
    'guestId', v_guest.id,
    'usefulParticipation', v_has_peer AND v_guest.joined_at <= v_now - interval '3 minutes'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.room_guest_invite_audience(char, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_room_guest_v2(char, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.room_guest_invite_audience(char, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_room_guest_v2(char, boolean) TO service_role;
