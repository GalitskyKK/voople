-- Server-owned inline rename for non-Lobby Group Rooms.
-- This migration contains schema logic only; it carries no production data,
-- credentials, invitation values or user-authored content.

CREATE OR REPLACE FUNCTION public.rename_group_room(
  p_room_id uuid,
  p_user_id uuid,
  p_name varchar
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
  IF length(btrim(p_name)) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'ROOM_NAME_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_room_id::text, 912));

  SELECT * INTO v_room
  FROM public.group_rooms
  WHERE id = p_room_id
    AND archived_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR v_room.kind = 'lobby' THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  SELECT member.role INTO v_role
  FROM public.chat_members AS member
  WHERE member.chat_id = v_room.group_chat_id
    AND member.user_id = p_user_id;

  IF v_role IS NULL OR (
    v_role NOT IN ('owner', 'admin')
    AND v_room.created_by <> p_user_id
  ) THEN
    RAISE EXCEPTION 'ROOM_FORBIDDEN';
  END IF;

  UPDATE public.group_rooms
  SET name = btrim(p_name),
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

REVOKE ALL ON FUNCTION public.rename_group_room(uuid, uuid, varchar)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_group_room(uuid, uuid, varchar)
  TO service_role;
