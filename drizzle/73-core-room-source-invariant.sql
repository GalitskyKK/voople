-- Keep Split and accepted Voop inside the existing atomic create-and-join RPC.
-- The source is derived from server-owned membership/invite rows, never from a
-- client-selected session ID. Existing request IDs remain idempotent on retry.

CREATE OR REPLACE FUNCTION public.create_and_join_group_room(
  p_group_chat_id uuid,
  p_user_id uuid,
  p_kind varchar,
  p_name varchar,
  p_request_id uuid,
  p_mic_muted boolean DEFAULT true,
  p_allow_cross_context boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_room public.group_rooms%ROWTYPE;
  v_voop public.chat_room_invites%ROWTYPE;
  v_source_user_id uuid;
  v_source_session_id uuid;
  v_room_payload jsonb;
  v_join_payload jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 913));

  SELECT * INTO v_room
  FROM public.group_rooms
  WHERE creation_request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_room.archived_at IS NOT NULL
      OR v_room.group_chat_id <> p_group_chat_id
      OR v_room.created_by <> p_user_id
      OR v_room.kind <> p_kind
      OR v_room.name <> btrim(p_name)
    THEN
      RAISE EXCEPTION 'ROOM_IDEMPOTENCY_CONFLICT';
    END IF;

    v_room_payload := jsonb_build_object(
      'id', v_room.id,
      'groupId', v_room.group_chat_id,
      'kind', v_room.kind,
      'name', v_room.name,
      'createdBy', v_room.created_by
    );
  ELSE
    IF p_kind = 'temporary' THEN
      SELECT * INTO v_voop
      FROM public.chat_room_invites
      WHERE id = p_request_id
        AND intent = 'voop'
      FOR UPDATE;

      IF FOUND THEN
        IF v_voop.chat_id <> p_group_chat_id
          OR v_voop.invitee_id <> p_user_id
          OR v_voop.status <> 'pending'
          OR v_voop.expires_at <= now()
        THEN
          RAISE EXCEPTION 'ROOM_SOURCE_INACTIVE';
        END IF;
        v_source_user_id := v_voop.inviter_id;
        v_source_session_id := v_voop.room_session_id;
      ELSE
        v_source_user_id := p_user_id;
      END IF;

      PERFORM pg_advisory_xact_lock(hashtextextended(v_source_user_id::text, 911));
      IF NOT EXISTS (
        SELECT 1
        FROM public.live_session_participants AS participant
        JOIN public.live_sessions AS session
          ON session.id = participant.session_id
        JOIN public.group_rooms AS source_room
          ON source_room.id = session.room_id
        WHERE participant.user_id = v_source_user_id
          AND (v_source_session_id IS NULL OR participant.session_id = v_source_session_id)
          AND participant.left_at IS NULL
          AND participant.last_seen_at > now() - interval '120 seconds'
          AND session.kind = 'group_room'
          AND session.status IN ('connecting', 'active')
          AND session.ended_at IS NULL
          AND session.conversation_id = p_group_chat_id
          AND source_room.group_chat_id = p_group_chat_id
          AND source_room.archived_at IS NULL
      ) THEN
        RAISE EXCEPTION 'ROOM_SOURCE_INACTIVE';
      END IF;
    END IF;

    v_room_payload := public.create_group_room(
      p_group_chat_id,
      p_user_id,
      p_kind,
      p_name
    );

    UPDATE public.group_rooms
    SET creation_request_id = p_request_id,
        updated_at = now()
    WHERE id = (v_room_payload->>'id')::uuid;
  END IF;

  v_join_payload := public.join_group_room(
    (v_room_payload->>'id')::uuid,
    p_user_id,
    p_mic_muted,
    p_allow_cross_context
  );

  RETURN jsonb_build_object(
    'room', v_room_payload,
    'join', v_join_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_and_join_group_room(
  uuid, uuid, varchar, varchar, uuid, boolean, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_and_join_group_room(
  uuid, uuid, varchar, varchar, uuid, boolean, boolean
) TO service_role;
