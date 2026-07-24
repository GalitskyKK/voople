-- Group invitations and the presence layer for chat-linked Rooms.

ALTER TABLE public.chat_members
  ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'member';

WITH ranked_members AS (
  SELECT
    chat_id,
    user_id,
    row_number() OVER (PARTITION BY chat_id ORDER BY joined_at ASC, user_id ASC) AS member_rank
  FROM public.chat_members
)
UPDATE public.chat_members AS member
SET role = 'owner'
FROM ranked_members
WHERE member.chat_id = ranked_members.chat_id
  AND member.user_id = ranked_members.user_id
  AND ranked_members.member_rank = 1
  AND EXISTS (
    SELECT 1
    FROM public.chats
    WHERE chats.id = member.chat_id
      AND chats.type = 'group'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.chat_members AS existing_owner
    WHERE existing_owner.chat_id = member.chat_id
      AND existing_owner.role = 'owner'
  );

ALTER TABLE public.chat_members
  DROP CONSTRAINT IF EXISTS chat_members_role_check;
ALTER TABLE public.chat_members
  ADD CONSTRAINT chat_members_role_check CHECK (role IN ('owner', 'admin', 'member'));

CREATE TABLE IF NOT EXISTS public.chat_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL,
  expires_at timestamp NOT NULL,
  max_uses integer NOT NULL DEFAULT 20,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chat_invites_token_hash_unique UNIQUE(token_hash),
  CONSTRAINT chat_invites_max_uses_check CHECK (max_uses BETWEEN 1 AND 100),
  CONSTRAINT chat_invites_use_count_check CHECK (use_count >= 0)
);

CREATE INDEX IF NOT EXISTS chat_invites_chat_idx
  ON public.chat_invites (chat_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  chat_id uuid PRIMARY KEY REFERENCES public.chats(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'active',
  access_mode varchar(20) NOT NULL DEFAULT 'open',
  started_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamp NOT NULL DEFAULT now(),
  ended_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chat_rooms_status_check CHECK (status IN ('active', 'ended')),
  CONSTRAINT chat_rooms_access_mode_check CHECK (access_mode IN ('open', 'locked'))
);

CREATE TABLE IF NOT EXISTS public.chat_room_participants (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mic_muted boolean NOT NULL DEFAULT true,
  joined_at timestamp NOT NULL DEFAULT now(),
  last_seen_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chat_room_participants_pk PRIMARY KEY(chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_room_participants_heartbeat_idx
  ON public.chat_room_participants (chat_id, last_seen_at DESC);

ALTER TABLE public.chat_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chat_invites FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_invites TO service_role;

DROP POLICY IF EXISTS chat_rooms_select_member ON public.chat_rooms;
CREATE POLICY chat_rooms_select_member
  ON public.chat_rooms FOR SELECT
  USING (public.is_chat_member(chat_id));

DROP POLICY IF EXISTS chat_room_participants_select_member ON public.chat_room_participants;
CREATE POLICY chat_room_participants_select_member
  ON public.chat_room_participants FOR SELECT
  USING (public.is_chat_member(chat_id));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.chat_rooms FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.chat_room_participants FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_rooms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_room_participants TO service_role;

CREATE OR REPLACE FUNCTION public.accept_chat_invite(
  p_token_hash varchar,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.chat_invites%ROWTYPE;
  v_member_count integer;
BEGIN
  SELECT *
  INTO v_invite
  FROM public.chat_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF v_invite.id IS NULL
    OR v_invite.revoked_at IS NOT NULL
    OR v_invite.expires_at <= now()
    OR v_invite.use_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Invite is unavailable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.chat_members
    WHERE chat_id = v_invite.chat_id
      AND user_id = p_user_id
  ) THEN
    RETURN v_invite.chat_id;
  END IF;

  SELECT count(*)
  INTO v_member_count
  FROM public.chat_members
  WHERE chat_id = v_invite.chat_id;

  IF v_member_count >= 20 THEN
    RAISE EXCEPTION 'Group is full';
  END IF;

  INSERT INTO public.chat_members (chat_id, user_id, role)
  VALUES (v_invite.chat_id, p_user_id, 'member');

  UPDATE public.chat_invites
  SET use_count = use_count + 1
  WHERE id = v_invite.id;

  RETURN v_invite.chat_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_chat_invite(varchar, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_chat_invite(varchar, uuid) TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
