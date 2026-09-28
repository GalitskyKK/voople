-- Session-scoped guest access for live Group Rooms.
-- Guest credentials are opaque random values; only SHA-256 hashes are stored.
-- Guests remain separate from users and chat_members and never inherit Group access.

CREATE TABLE IF NOT EXISTS public.room_guest_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  max_guests smallint NOT NULL DEFAULT 25,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_guest_invites_max_guests_check CHECK (max_guests BETWEEN 1 AND 50),
  CONSTRAINT room_guest_invites_use_count_check CHECK (use_count >= 0),
  CONSTRAINT room_guest_invites_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS room_guest_invites_session_state_idx
  ON public.room_guest_invites (live_session_id, revoked_at, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.live_session_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  invite_id uuid NOT NULL REFERENCES public.room_guest_invites(id) ON DELETE RESTRICT,
  join_request_id uuid NOT NULL UNIQUE,
  access_token_hash char(64) NOT NULL UNIQUE,
  display_name varchar(40) NOT NULL,
  mic_muted boolean NOT NULL DEFAULT true,
  camera_enabled boolean NOT NULL DEFAULT false,
  screen_sharing boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  access_expires_at timestamptz NOT NULL,
  left_at timestamptz,
  converted_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  converted_at timestamptz,
  CONSTRAINT live_session_guests_name_check CHECK (length(btrim(display_name)) BETWEEN 1 AND 40),
  CONSTRAINT live_session_guests_token_hash_check CHECK (access_token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT live_session_guests_conversion_check CHECK (
    (converted_user_id IS NULL AND converted_at IS NULL)
    OR (converted_user_id IS NOT NULL AND converted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS live_session_guests_presence_idx
  ON public.live_session_guests (live_session_id, left_at, last_seen_at DESC);

ALTER TABLE public.room_guest_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_guests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.room_guest_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.live_session_guests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.room_guest_invites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_session_guests TO service_role;

CREATE OR REPLACE FUNCTION public.create_room_guest_invite(
  p_live_session_id uuid,
  p_user_id uuid,
  p_token_hash char(64),
  p_expires_at timestamptz,
  p_max_guests smallint DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite public.room_guest_invites%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_live_session_id::text || p_user_id::text, 914));

  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_expires_at <= now()
    OR p_max_guests NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'ROOM_GUEST_INVITE_INVALID';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.live_sessions AS session
    JOIN public.group_rooms AS room ON room.id = session.room_id
    JOIN public.live_session_participants AS participant
      ON participant.session_id = session.id
     AND participant.user_id = p_user_id
     AND participant.left_at IS NULL
    JOIN public.chat_members AS member
      ON member.chat_id = session.conversation_id
     AND member.user_id = p_user_id
    WHERE session.id = p_live_session_id
      AND session.kind = 'group_room'
      AND session.status IN ('connecting', 'active', 'grace')
      AND session.ended_at IS NULL
      AND room.archived_at IS NULL
      AND room.group_chat_id = session.conversation_id
  ) THEN
    RAISE EXCEPTION 'ROOM_GUEST_INVITE_FORBIDDEN';
  END IF;

  UPDATE public.room_guest_invites
  SET revoked_at = now(), updated_at = now()
  WHERE live_session_id = p_live_session_id
    AND created_by = p_user_id
    AND revoked_at IS NULL
    AND expires_at > now();

  INSERT INTO public.room_guest_invites (
    live_session_id, created_by, token_hash, expires_at, max_guests
  ) VALUES (
    p_live_session_id, p_user_id, p_token_hash, p_expires_at, p_max_guests
  )
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'id', v_invite.id,
    'expiresAt', v_invite.expires_at,
    'maxGuests', v_invite.max_guests
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_room_as_guest(
  p_invite_token_hash char(64),
  p_access_token_hash char(64),
  p_display_name varchar,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_invite public.room_guest_invites%ROWTYPE;
  v_session public.live_sessions%ROWTYPE;
  v_guest public.live_session_guests%ROWTYPE;
  v_active_guests integer;
BEGIN
  SELECT * INTO v_invite
  FROM public.room_guest_invites
  WHERE token_hash = p_invite_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_GUEST_INVITE_MISSING'; END IF;
  IF v_invite.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'ROOM_GUEST_INVITE_REVOKED'; END IF;
  IF v_invite.expires_at <= v_now THEN RAISE EXCEPTION 'ROOM_GUEST_INVITE_EXPIRED'; END IF;
  IF p_request_id IS NULL OR p_access_token_hash !~ '^[0-9a-f]{64}$'
    OR length(btrim(p_display_name)) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'ROOM_GUEST_INPUT_INVALID';
  END IF;

  SELECT * INTO v_session
  FROM public.live_sessions
  WHERE id = v_invite.live_session_id
    AND kind = 'group_room'
    AND status IN ('connecting', 'active', 'grace')
    AND ended_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROOM_GUEST_SESSION_ENDED'; END IF;

  SELECT * INTO v_guest
  FROM public.live_session_guests
  WHERE join_request_id = p_request_id;
  IF FOUND THEN
    IF v_guest.invite_id <> v_invite.id
      OR v_guest.access_token_hash <> p_access_token_hash
      OR v_guest.left_at IS NOT NULL
      OR v_guest.access_expires_at <= v_now THEN
      RAISE EXCEPTION 'ROOM_GUEST_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'guestId', v_guest.id,
      'sessionId', v_session.id,
      'providerSessionId', v_session.provider_session_id,
      'displayName', v_guest.display_name,
      'expiresAt', v_guest.access_expires_at
    );
  END IF;

  SELECT count(*) INTO v_active_guests
  FROM public.live_session_guests
  WHERE live_session_id = v_session.id
    AND left_at IS NULL
    AND access_expires_at > v_now
    AND last_seen_at > v_now - interval '60 seconds'
    AND converted_at IS NULL;
  IF v_active_guests >= v_invite.max_guests THEN
    RAISE EXCEPTION 'ROOM_GUEST_CAPACITY_REACHED';
  END IF;

  INSERT INTO public.live_session_guests (
    live_session_id,
    invite_id,
    join_request_id,
    access_token_hash,
    display_name,
    access_expires_at
  ) VALUES (
    v_session.id,
    v_invite.id,
    p_request_id,
    p_access_token_hash,
    btrim(p_display_name),
    v_now + interval '6 hours'
  )
  RETURNING * INTO v_guest;

  UPDATE public.room_guest_invites
  SET use_count = use_count + 1, updated_at = v_now
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'guestId', v_guest.id,
    'sessionId', v_session.id,
    'providerSessionId', v_session.provider_session_id,
    'displayName', v_guest.display_name,
    'expiresAt', v_guest.access_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_room_guest(
  p_access_token_hash char(64),
  p_mic_muted boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.live_session_guests AS guest
  SET mic_muted = p_mic_muted,
      last_seen_at = now()
  FROM public.live_sessions AS session
  WHERE guest.access_token_hash = p_access_token_hash
    AND guest.live_session_id = session.id
    AND guest.left_at IS NULL
    AND guest.converted_at IS NULL
    AND guest.access_expires_at > now()
    AND session.status IN ('connecting', 'active', 'grace')
    AND session.ended_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_room_guest(p_access_token_hash char(64))
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.live_session_guests
  SET left_at = now(), last_seen_at = now(), mic_muted = true
  WHERE access_token_hash = p_access_token_hash
    AND left_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.create_room_guest_invite(uuid, uuid, char, timestamptz, smallint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_room_as_guest(char, char, varchar, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_room_guest(char, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_room_guest(char) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_guest_invite(uuid, uuid, char, timestamptz, smallint) TO service_role;
GRANT EXECUTE ON FUNCTION public.join_room_as_guest(char, char, varchar, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_room_guest(char, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.leave_room_guest(char) TO service_role;

COMMENT ON TABLE public.room_guest_invites IS
  'Short-lived Room-only invitation hashes. Possession never grants Group membership.';
COMMENT ON TABLE public.live_session_guests IS
  'Ephemeral Room participants that remain separate from users and chat_members.';
