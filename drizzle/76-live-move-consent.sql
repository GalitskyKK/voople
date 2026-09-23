-- One persisted consent aggregate for Split and Voop. Notifications keep using
-- the existing room_invite type; their reference_id points to a consent row.
CREATE TABLE IF NOT EXISTS public.live_move_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  source_session_id uuid NOT NULL REFERENCES public.live_sessions(id),
  inviter_id uuid NOT NULL REFERENCES public.users(id),
  mode varchar(10) NOT NULL CHECK (mode IN ('split', 'voop')),
  status varchar(12) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'declined', 'cancelled', 'expired')),
  target_room_id uuid REFERENCES public.group_rooms(id),
  target_session_id uuid REFERENCES public.live_sessions(id),
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS live_move_one_pending_inviter_source
  ON public.live_move_requests (inviter_id, source_session_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.live_move_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.live_move_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status varchar(12) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  responded_at timestamp,
  UNIQUE (request_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_move_consents_user_idx
  ON public.live_move_consents (user_id, request_id);

ALTER TABLE public.live_move_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_move_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_move_requests, public.live_move_consents
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_move_requests, public.live_move_consents
  TO service_role;

CREATE OR REPLACE FUNCTION public.request_live_move(
  p_group_chat_id uuid,
  p_inviter_id uuid,
  p_invitee_ids uuid[],
  p_mode varchar,
  p_expected_source_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source public.live_sessions%ROWTYPE;
  v_request public.live_move_requests%ROWTYPE;
  v_count integer;
  v_invitees uuid[];
BEGIN
  IF p_mode NOT IN ('split', 'voop') OR p_invitee_ids IS NULL
    OR cardinality(p_invitee_ids) NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'LIVE_MOVE_SELECTION_INVALID';
  END IF;
  SELECT array_agg(id ORDER BY id) INTO v_invitees
  FROM (SELECT DISTINCT unnest(p_invitee_ids) AS id) AS selected;
  IF cardinality(v_invitees) <> cardinality(p_invitee_ids)
    OR p_inviter_id = ANY(v_invitees)
    OR array_position(v_invitees, NULL) IS NOT NULL
    OR (p_mode = 'voop' AND cardinality(v_invitees) <> 1) THEN
    RAISE EXCEPTION 'LIVE_MOVE_SELECTION_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_inviter_id::text, 911));
  SELECT session.* INTO v_source
  FROM public.live_session_participants AS participant
  JOIN public.live_sessions AS session ON session.id = participant.session_id
  JOIN public.group_rooms AS room ON room.id = session.room_id
  JOIN public.chat_members AS inviter_member
    ON inviter_member.chat_id = p_group_chat_id
   AND inviter_member.user_id = p_inviter_id
  WHERE participant.user_id = p_inviter_id
    AND participant.left_at IS NULL
    AND participant.last_seen_at > now() - interval '120 seconds'
    AND session.kind = 'group_room'
    AND session.status IN ('active', 'connecting')
    AND session.ended_at IS NULL
    AND session.conversation_id = p_group_chat_id
    AND room.group_chat_id = p_group_chat_id
    AND room.archived_at IS NULL
  FOR UPDATE OF session;
  IF NOT FOUND OR (p_expected_source_session_id IS NOT NULL
    AND v_source.id <> p_expected_source_session_id) THEN
    RAISE EXCEPTION 'ROOM_SOURCE_INACTIVE';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.live_session_participants AS participant
  JOIN public.chat_members AS member
    ON member.user_id = participant.user_id AND member.chat_id = p_group_chat_id
  WHERE participant.session_id = v_source.id
    AND participant.user_id = ANY(v_invitees)
    AND participant.left_at IS NULL
    AND participant.last_seen_at > now() - interval '120 seconds';
  IF v_count <> cardinality(v_invitees) THEN
    RAISE EXCEPTION 'ROOM_SOURCE_INACTIVE';
  END IF;

  UPDATE public.live_move_requests
  SET status = 'expired', updated_at = now()
  WHERE inviter_id = p_inviter_id AND source_session_id = v_source.id
    AND status = 'pending' AND expires_at <= now();

  INSERT INTO public.live_move_requests (
    group_chat_id, source_session_id, inviter_id, mode, expires_at
  ) VALUES (
    p_group_chat_id, v_source.id, p_inviter_id, p_mode, now() + interval '15 minutes'
  ) RETURNING * INTO v_request;

  WITH created AS (
    INSERT INTO public.live_move_consents (request_id, user_id)
    SELECT v_request.id, unnest(v_invitees)
    RETURNING id, user_id
  )
  INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
  SELECT user_id, 'room_invite', p_inviter_id, id FROM created;

  RETURN jsonb_build_object(
    'id', v_request.id, 'sourceSessionId', v_source.id,
    'expiresAt', v_request.expires_at, 'selectedCount', cardinality(v_invitees)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_live_move(
  p_consent_id uuid,
  p_user_id uuid,
  p_accept boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.live_move_requests%ROWTYPE;
  v_consent public.live_move_consents%ROWTYPE;
  v_source public.live_sessions%ROWTYPE;
  v_room jsonb;
  v_join jsonb;
  v_ids uuid[];
  v_user_id uuid;
  v_fresh_count integer;
  v_total integer;
  v_accepted integer;
BEGIN
  SELECT * INTO v_consent FROM public.live_move_consents
  WHERE id = p_consent_id AND user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LIVE_MOVE_FORBIDDEN'; END IF;
  SELECT * INTO v_request FROM public.live_move_requests
  WHERE id = v_consent.request_id FOR UPDATE;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('requestId', v_request.id, 'status', v_request.status,
      'targetRoomId', v_request.target_room_id, 'targetSessionId', v_request.target_session_id);
  END IF;
  IF v_request.expires_at <= now() THEN
    UPDATE public.live_move_requests SET status = 'expired', updated_at = now()
    WHERE id = v_request.id;
    UPDATE public.live_move_consents SET status = 'expired'
    WHERE request_id = v_request.id AND status = 'pending';
    RETURN jsonb_build_object('requestId', v_request.id, 'status', 'expired');
  END IF;
  IF NOT p_accept THEN
    UPDATE public.live_move_consents SET status = 'declined', responded_at = now()
    WHERE id = v_consent.id;
    UPDATE public.live_move_consents SET status = 'cancelled'
    WHERE request_id = v_request.id AND status = 'pending';
    UPDATE public.live_move_requests SET status = 'declined', updated_at = now()
    WHERE id = v_request.id;
    RETURN jsonb_build_object('requestId', v_request.id, 'status', 'declined');
  END IF;

  UPDATE public.live_move_consents SET status = 'accepted', responded_at = now()
  WHERE id = v_consent.id AND status = 'pending';
  SELECT count(*), count(*) FILTER (WHERE status = 'accepted')
  INTO v_total, v_accepted FROM public.live_move_consents
  WHERE request_id = v_request.id;
  IF v_accepted <> v_total THEN
    RETURN jsonb_build_object('requestId', v_request.id, 'status', 'pending',
      'acceptedCount', v_accepted, 'selectedCount', v_total);
  END IF;

  SELECT array_agg(id ORDER BY id) INTO v_ids FROM (
    SELECT v_request.inviter_id AS id
    UNION SELECT user_id FROM public.live_move_consents
    WHERE request_id = v_request.id
  ) AS selected;
  -- The existing join RPC takes advisory lock namespace 911 per actor. Take
  -- all of them in UUID order before any row lock or move to avoid cycles.
  FOREACH v_user_id IN ARRAY v_ids LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 911));
  END LOOP;

  SELECT session.* INTO v_source FROM public.live_sessions AS session
  JOIN public.group_rooms AS room ON room.id = session.room_id
  WHERE session.id = v_request.source_session_id
    AND session.kind = 'group_room'
    AND session.status IN ('active', 'connecting')
    AND session.ended_at IS NULL
    AND session.conversation_id = v_request.group_chat_id
    AND room.group_chat_id = v_request.group_chat_id
    AND room.archived_at IS NULL
  FOR UPDATE OF session;
  SELECT count(*) INTO v_fresh_count
  FROM public.live_session_participants AS participant
  JOIN public.chat_members AS member
    ON member.user_id = participant.user_id AND member.chat_id = v_request.group_chat_id
  WHERE participant.user_id = ANY(v_ids)
    AND participant.session_id = v_request.source_session_id
    AND participant.left_at IS NULL
    AND participant.last_seen_at > now() - interval '120 seconds';
  IF v_source.id IS NULL OR v_fresh_count <> cardinality(v_ids) THEN
    UPDATE public.live_move_requests SET status = 'cancelled', updated_at = now()
    WHERE id = v_request.id;
    UPDATE public.live_move_consents SET status = 'cancelled'
    WHERE request_id = v_request.id AND status = 'pending';
    RETURN jsonb_build_object('requestId', v_request.id, 'status', 'cancelled');
  END IF;

  v_room := public.create_group_room(
    v_request.group_chat_id, v_request.inviter_id, 'temporary', 'Сплит'
  );
  FOREACH v_user_id IN ARRAY v_ids LOOP
    v_join := public.join_group_room((v_room->>'id')::uuid, v_user_id, true, false);
  END LOOP;
  UPDATE public.live_move_requests
  SET status = 'completed', target_room_id = (v_room->>'id')::uuid,
      target_session_id = (v_join->>'sessionId')::uuid, updated_at = now()
  WHERE id = v_request.id;
  RETURN jsonb_build_object('requestId', v_request.id, 'status', 'completed',
    'targetRoomId', v_room->>'id', 'targetSessionId', v_join->>'sessionId');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_live_move(p_request_id uuid, p_inviter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_request public.live_move_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.live_move_requests
  WHERE id = p_request_id AND inviter_id = p_inviter_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LIVE_MOVE_FORBIDDEN'; END IF;
  IF v_request.status = 'pending' THEN
    UPDATE public.live_move_requests SET status = 'cancelled', updated_at = now()
    WHERE id = p_request_id;
    UPDATE public.live_move_consents SET status = 'cancelled'
    WHERE request_id = p_request_id AND status = 'pending';
    v_request.status := 'cancelled';
  END IF;
  RETURN jsonb_build_object('requestId', v_request.id, 'status', v_request.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.status_live_move(p_request_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.live_move_requests%ROWTYPE;
  v_total integer;
  v_accepted integer;
  v_expected integer;
  v_fresh integer;
BEGIN
  SELECT * INTO v_request FROM public.live_move_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR (
    v_request.inviter_id <> p_actor_id
    AND NOT EXISTS (
      SELECT 1 FROM public.live_move_consents
      WHERE request_id = p_request_id AND user_id = p_actor_id
    )
  ) THEN RAISE EXCEPTION 'LIVE_MOVE_FORBIDDEN'; END IF;
  IF v_request.status = 'pending' AND v_request.expires_at <= now() THEN
    UPDATE public.live_move_requests SET status = 'expired', updated_at = now()
    WHERE id = p_request_id;
    UPDATE public.live_move_consents SET status = 'expired'
    WHERE request_id = p_request_id AND status = 'pending';
    v_request.status := 'expired';
  END IF;
  IF v_request.status = 'pending' THEN
    SELECT count(*) + 1 INTO v_expected FROM public.live_move_consents
    WHERE request_id = p_request_id;
    SELECT count(*) INTO v_fresh
    FROM public.live_session_participants AS participant
    JOIN public.chat_members AS member
      ON member.user_id = participant.user_id
     AND member.chat_id = v_request.group_chat_id
    JOIN public.live_sessions AS session ON session.id = participant.session_id
    JOIN public.group_rooms AS room ON room.id = session.room_id
    WHERE participant.session_id = v_request.source_session_id
      AND participant.user_id IN (
        SELECT v_request.inviter_id
        UNION SELECT user_id FROM public.live_move_consents
        WHERE request_id = p_request_id
      )
      AND participant.left_at IS NULL
      AND participant.last_seen_at > now() - interval '120 seconds'
      AND session.status IN ('active', 'connecting')
      AND session.ended_at IS NULL
      AND session.conversation_id = v_request.group_chat_id
      AND room.group_chat_id = v_request.group_chat_id
      AND room.archived_at IS NULL;
    IF v_fresh <> v_expected THEN
      UPDATE public.live_move_requests SET status = 'cancelled', updated_at = now()
      WHERE id = p_request_id;
      UPDATE public.live_move_consents SET status = 'cancelled'
      WHERE request_id = p_request_id AND status = 'pending';
      v_request.status := 'cancelled';
    END IF;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE status = 'accepted')
  INTO v_total, v_accepted FROM public.live_move_consents
  WHERE request_id = p_request_id;
  RETURN jsonb_build_object(
    'id', v_request.id, 'groupId', v_request.group_chat_id,
    'sourceSessionId', v_request.source_session_id,
    'mode', v_request.mode, 'status', v_request.status,
    'acceptedCount', v_accepted, 'selectedCount', v_total,
    'targetRoomId', v_request.target_room_id,
    'targetSessionId', v_request.target_session_id,
    'expiresAt', v_request.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_live_move(uuid, uuid, uuid[], varchar, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_live_move(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_live_move(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.status_live_move(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_live_move(uuid, uuid, uuid[], varchar, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_live_move(uuid, uuid, boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_live_move(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.status_live_move(uuid, uuid)
  TO service_role;
