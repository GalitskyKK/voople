-- Idempotent, atomic Room creation + join for the internal core rollout.
-- A failed cross-context join rolls back the Room insert in the same statement.

ALTER TABLE public.group_rooms
  ADD COLUMN IF NOT EXISTS creation_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS group_rooms_creation_request_unique
  ON public.group_rooms (creation_request_id)
  WHERE creation_request_id IS NOT NULL;

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
