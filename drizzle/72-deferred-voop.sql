-- Deferred Voop requests reuse the protected Room invitation lifecycle without
-- creating a temporary Room before the invitee explicitly accepts.

ALTER TABLE public.chat_room_invites
  ADD COLUMN IF NOT EXISTS intent varchar(20) NOT NULL DEFAULT 'join_room',
  ADD COLUMN IF NOT EXISTS target_room_session_id uuid;

ALTER TABLE public.chat_room_invites
  DROP CONSTRAINT IF EXISTS chat_room_invites_intent_check;

ALTER TABLE public.chat_room_invites
  ADD CONSTRAINT chat_room_invites_intent_check
  CHECK (intent IN ('join_room', 'voop'));

ALTER TABLE public.chat_room_invites
  DROP CONSTRAINT IF EXISTS chat_room_invites_session_invitee_unique;

ALTER TABLE public.chat_room_invites
  ADD CONSTRAINT chat_room_invites_session_invitee_intent_unique
  UNIQUE (chat_id, room_session_id, invitee_id, intent);

CREATE INDEX IF NOT EXISTS chat_room_invites_inviter_intent_status_idx
  ON public.chat_room_invites (inviter_id, intent, status, updated_at DESC);
