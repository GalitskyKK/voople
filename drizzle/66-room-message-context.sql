-- Attach Room context to Group messages inside the same database transaction.
-- Clients do not choose a Room id: the database derives the sender's exact
-- active LiveSession and silently leaves ordinary/direct messages unchanged.

CREATE OR REPLACE FUNCTION public.attach_active_room_context_to_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_root_chat_id uuid;
  v_room_id uuid;
  v_live_session_id uuid;
  v_room_name varchar(80);
  v_room_kind varchar(20);
BEGIN
  SELECT COALESCE(chat.parent_chat_id, chat.id)
  INTO v_root_chat_id
  FROM public.chats AS chat
  WHERE chat.id = NEW.chat_id;

  IF v_root_chat_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT room.id, session.id, room.name, room.kind
  INTO v_room_id, v_live_session_id, v_room_name, v_room_kind
  FROM public.live_session_participants AS participant
  JOIN public.live_sessions AS session
    ON session.id = participant.session_id
   AND session.kind = 'group_room'
   AND session.status IN ('connecting', 'active', 'grace')
   AND session.ended_at IS NULL
  JOIN public.group_rooms AS room
    ON room.id = session.room_id
   AND room.archived_at IS NULL
   AND room.group_chat_id = v_root_chat_id
  WHERE participant.user_id = NEW.sender_id
    AND participant.left_at IS NULL
  ORDER BY participant.joined_at DESC
  LIMIT 1;

  IF v_live_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.message_room_contexts (
    message_id,
    room_id,
    live_session_id,
    room_name_snapshot,
    room_kind_snapshot,
    captured_at
  ) VALUES (
    NEW.id,
    v_room_id,
    v_live_session_id,
    v_room_name,
    v_room_kind,
    now()
  )
  ON CONFLICT (message_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_attach_active_room_context ON public.messages;
CREATE TRIGGER messages_attach_active_room_context
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.attach_active_room_context_to_message();

REVOKE ALL ON FUNCTION public.attach_active_room_context_to_message()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_active_room_context_to_message()
  TO service_role;

COMMENT ON FUNCTION public.attach_active_room_context_to_message() IS
  'Atomically snapshots the sender active same-Group Room context for a new message.';
