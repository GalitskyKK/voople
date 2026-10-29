-- Additive Room identity. No browser writes; validated service requests own it.
CREATE TABLE IF NOT EXISTS public.group_room_covers (
  room_id uuid PRIMARY KEY REFERENCES public.group_rooms(id) ON DELETE CASCADE,
  preset varchar(20) NOT NULL DEFAULT 'orbit' CHECK (preset IN ('orbit', 'arcade', 'wave', 'dusk')),
  media_key text CHECK (media_key IS NULL OR (length(media_key) <= 500 AND media_key LIKE 'uploads/room-cover/%' AND position('..' IN media_key) = 0)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_room_covers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.group_room_covers FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.group_room_covers TO service_role;

CREATE OR REPLACE FUNCTION public.set_group_room_cover(
  p_room_id uuid, p_user_id uuid, p_preset varchar, p_media_key text
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_group_id uuid; v_creator uuid;
BEGIN
  SELECT group_chat_id, created_by INTO v_group_id, v_creator
    FROM public.group_rooms WHERE id = p_room_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_NOT_FOUND'; END IF;
  PERFORM 1 FROM public.chat_members
    WHERE chat_id = v_group_id AND user_id = p_user_id
      AND (role IN ('owner', 'admin') OR v_creator = p_user_id) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_FORBIDDEN'; END IF;
  INSERT INTO public.group_room_covers (room_id, preset, media_key)
    VALUES (p_room_id, p_preset, p_media_key)
    ON CONFLICT (room_id) DO UPDATE SET preset = EXCLUDED.preset,
      media_key = EXCLUDED.media_key, updated_at = now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_group_room_cover(uuid, uuid, varchar, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_group_room_cover(uuid, uuid, varchar, text) TO service_role;

-- Cover and create/join succeed together, including cross-context rollback.
-- Keep the existing RPC signature available to supported older clients.
CREATE OR REPLACE FUNCTION public.create_and_join_group_room_with_cover(
  p_group_chat_id uuid, p_user_id uuid, p_kind varchar, p_name varchar,
  p_request_id uuid, p_mic_muted boolean, p_allow_cross_context boolean,
  p_cover_preset varchar, p_cover_media_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_result jsonb;
BEGIN
  IF p_kind <> 'pinned' THEN RAISE EXCEPTION 'ROOM_FORBIDDEN'; END IF;
  v_result := public.create_and_join_group_room(
    p_group_chat_id, p_user_id, p_kind, p_name, p_request_id, p_mic_muted, p_allow_cross_context
  );
  INSERT INTO public.group_room_covers (room_id, preset, media_key)
    VALUES ((v_result->'room'->>'id')::uuid, p_cover_preset, p_cover_media_key)
    ON CONFLICT (room_id) DO NOTHING;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_and_join_group_room_with_cover(uuid, uuid, varchar, varchar, uuid, boolean, boolean, varchar, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_and_join_group_room_with_cover(uuid, uuid, varchar, varchar, uuid, boolean, boolean, varchar, text) TO service_role;
