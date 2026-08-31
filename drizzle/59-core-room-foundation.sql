-- Additive Lobby / Room / LiveSession foundation for the staged core rework.
-- Legacy chat_rooms and chat_room_participants remain available to old clients.

CREATE TABLE IF NOT EXISTS public.group_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  group_chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL,
  name varchar(80) NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  archived_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT group_rooms_kind_check CHECK (kind IN ('lobby', 'temporary', 'pinned')),
  CONSTRAINT group_rooms_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS group_rooms_group_state_idx
  ON public.group_rooms (group_chat_id, archived_at, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS group_rooms_active_lobby_unique
  ON public.group_rooms (group_chat_id)
  WHERE kind = 'lobby' AND archived_at IS NULL;

INSERT INTO public.group_rooms (group_chat_id, kind, name)
SELECT chat.id, 'lobby', 'Лобби'
FROM public.chats AS chat
WHERE chat.type = 'group'
  AND chat.parent_chat_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.group_rooms AS room
    WHERE room.group_chat_id = chat.id
      AND room.kind = 'lobby'
      AND room.archived_at IS NULL
  );

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.group_rooms(id) ON DELETE SET NULL,
  provider_session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'connecting',
  started_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  started_at timestamp NOT NULL DEFAULT now(),
  empty_since timestamp,
  ended_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT live_sessions_kind_check CHECK (kind IN ('direct_call', 'group_room')),
  CONSTRAINT live_sessions_status_check CHECK (status IN ('connecting', 'active', 'grace', 'ended')),
  CONSTRAINT live_sessions_context_check CHECK (
    (kind = 'direct_call' AND room_id IS NULL)
    OR (kind = 'group_room' AND room_id IS NOT NULL)
  ),
  CONSTRAINT live_sessions_ended_check CHECK (
    (status = 'ended' AND ended_at IS NOT NULL)
    OR (status <> 'ended' AND ended_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_provider_session_unique
  ON public.live_sessions (provider_session_id);

CREATE INDEX IF NOT EXISTS live_sessions_conversation_state_idx
  ON public.live_sessions (conversation_id, ended_at, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_active_room_unique
  ON public.live_sessions (room_id)
  WHERE room_id IS NOT NULL AND ended_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_active_direct_unique
  ON public.live_sessions (conversation_id)
  WHERE kind = 'direct_call' AND ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.live_session_participants (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mic_muted boolean NOT NULL DEFAULT true,
  camera_enabled boolean NOT NULL DEFAULT false,
  screen_sharing boolean NOT NULL DEFAULT false,
  joined_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now(),
  left_at timestamp,
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS live_session_participants_presence_idx
  ON public.live_session_participants (session_id, left_at, last_seen_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS live_session_participants_active_user_unique
  ON public.live_session_participants (user_id)
  WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS public.message_room_contexts (
  message_id uuid PRIMARY KEY REFERENCES public.messages(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.group_rooms(id) ON DELETE SET NULL,
  live_session_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  room_name_snapshot varchar(80) NOT NULL,
  room_kind_snapshot varchar(20) NOT NULL,
  captured_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT message_room_contexts_kind_check
    CHECK (room_kind_snapshot IN ('lobby', 'temporary', 'pinned')),
  CONSTRAINT message_room_contexts_name_check
    CHECK (length(btrim(room_name_snapshot)) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS message_room_contexts_room_history_idx
  ON public.message_room_contexts (room_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS message_room_contexts_live_session_idx
  ON public.message_room_contexts (live_session_id, captured_at DESC);

ALTER TABLE public.group_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_room_contexts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.group_rooms FROM anon, authenticated;
REVOKE ALL ON TABLE public.live_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.live_session_participants FROM anon, authenticated;
REVOKE ALL ON TABLE public.message_room_contexts FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_session_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_room_contexts TO service_role;
