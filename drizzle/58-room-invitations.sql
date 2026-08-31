-- Actionable, session-bound invitations for active group Rooms.

ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'room_invite';

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS session_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.chat_room_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  room_session_id uuid NOT NULL,
  inviter_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending',
  expires_at timestamp NOT NULL,
  responded_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chat_room_invites_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  CONSTRAINT chat_room_invites_distinct_users_check CHECK (inviter_id <> invitee_id),
  CONSTRAINT chat_room_invites_session_invitee_unique
    UNIQUE (chat_id, room_session_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS chat_room_invites_invitee_status_idx
  ON public.chat_room_invites (invitee_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_room_invites_session_idx
  ON public.chat_room_invites (chat_id, room_session_id, created_at DESC);

ALTER TABLE public.chat_room_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chat_room_invites FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_room_invites TO service_role;

