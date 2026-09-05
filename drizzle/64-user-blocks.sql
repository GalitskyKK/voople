-- Server-owned user blocking. Existing shared Group history remains intact,
-- while direct contact, follows, pins and Room invitations fail closed.

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self_check CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
  ON public.user_blocks (blocked_id, blocker_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_blocks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO service_role;

CREATE OR REPLACE FUNCTION public.users_have_block(p_first_id uuid, p_second_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_blocks
    WHERE (blocker_id = p_first_id AND blocked_id = p_second_id)
       OR (blocker_id = p_second_id AND blocked_id = p_first_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.set_user_block(
  p_blocker_id uuid,
  p_blocked_id uuid,
  p_blocked boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_low_id uuid;
  v_high_id uuid;
BEGIN
  IF p_blocker_id IS NULL OR p_blocked_id IS NULL OR p_blocker_id = p_blocked_id THEN
    RAISE EXCEPTION 'USER_BLOCK_INVALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_blocker_id)
    OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_blocked_id) THEN
    RAISE EXCEPTION 'USER_BLOCK_TARGET_MISSING';
  END IF;

  v_low_id := LEAST(p_blocker_id, p_blocked_id);
  v_high_id := GREATEST(p_blocker_id, p_blocked_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_low_id::text || v_high_id::text, 918));

  IF p_blocked THEN
    INSERT INTO public.user_blocks (blocker_id, blocked_id)
    VALUES (p_blocker_id, p_blocked_id)
    ON CONFLICT DO NOTHING;

    DELETE FROM public.follows
    WHERE (follower_id = p_blocker_id AND following_id = p_blocked_id)
       OR (follower_id = p_blocked_id AND following_id = p_blocker_id);
    DELETE FROM public.user_contact_pins
    WHERE (user_id = p_blocker_id AND pinned_user_id = p_blocked_id)
       OR (user_id = p_blocked_id AND pinned_user_id = p_blocker_id);
    UPDATE public.chat_room_invites
    SET status = 'cancelled', updated_at = now()
    WHERE status = 'pending'
      AND (
        (inviter_id = p_blocker_id AND invitee_id = p_blocked_id)
        OR (inviter_id = p_blocked_id AND invitee_id = p_blocker_id)
      );
  ELSE
    DELETE FROM public.user_blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;
  END IF;

  RETURN p_blocked;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_blocked_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.users_have_block(NEW.follower_id, NEW.following_id) THEN
    RAISE EXCEPTION 'USER_INTERACTION_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS follows_reject_blocked_users ON public.follows;
CREATE TRIGGER follows_reject_blocked_users
BEFORE INSERT OR UPDATE OF follower_id, following_id ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_follow();

CREATE OR REPLACE FUNCTION public.reject_blocked_contact_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.users_have_block(NEW.user_id, NEW.pinned_user_id) THEN
    RAISE EXCEPTION 'USER_INTERACTION_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_pins_reject_blocked_users ON public.user_contact_pins;
CREATE TRIGGER contact_pins_reject_blocked_users
BEFORE INSERT OR UPDATE OF user_id, pinned_user_id ON public.user_contact_pins
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_contact_pin();

CREATE OR REPLACE FUNCTION public.reject_blocked_room_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'pending' AND public.users_have_block(NEW.inviter_id, NEW.invitee_id) THEN
    RAISE EXCEPTION 'USER_INTERACTION_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_invites_reject_blocked_users ON public.chat_room_invites;
CREATE TRIGGER room_invites_reject_blocked_users
BEFORE INSERT OR UPDATE OF inviter_id, invitee_id, status ON public.chat_room_invites
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_room_invite();

CREATE OR REPLACE FUNCTION public.reject_blocked_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pair public.direct_chat_pairs%ROWTYPE;
BEGIN
  SELECT * INTO v_pair
  FROM public.direct_chat_pairs
  WHERE chat_id = NEW.chat_id;
  IF FOUND AND public.users_have_block(v_pair.user_low_id, v_pair.user_high_id) THEN
    RAISE EXCEPTION 'USER_INTERACTION_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_reject_blocked_direct_users ON public.messages;
CREATE TRIGGER messages_reject_blocked_direct_users
BEFORE INSERT OR UPDATE OF chat_id, sender_id ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_direct_message();

CREATE OR REPLACE FUNCTION public.reject_blocked_direct_pair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.users_have_block(NEW.user_low_id, NEW.user_high_id) THEN
    RAISE EXCEPTION 'USER_INTERACTION_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_pairs_reject_blocked_users ON public.direct_chat_pairs;
CREATE TRIGGER direct_pairs_reject_blocked_users
BEFORE INSERT OR UPDATE OF user_low_id, user_high_id ON public.direct_chat_pairs
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_direct_pair();

CREATE OR REPLACE FUNCTION public.reject_blocked_direct_room_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pair public.direct_chat_pairs%ROWTYPE;
BEGIN
  SELECT * INTO v_pair
  FROM public.direct_chat_pairs
  WHERE chat_id = NEW.chat_id;
  IF FOUND AND public.users_have_block(v_pair.user_low_id, v_pair.user_high_id) THEN
    RAISE EXCEPTION 'USER_INTERACTION_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_room_participants_reject_blocked_users
  ON public.chat_room_participants;
CREATE TRIGGER direct_room_participants_reject_blocked_users
BEFORE INSERT OR UPDATE OF chat_id, user_id ON public.chat_room_participants
FOR EACH ROW EXECUTE FUNCTION public.reject_blocked_direct_room_participant();

REVOKE ALL ON FUNCTION public.users_have_block(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_block(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_contact_pin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_room_invite() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_direct_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_direct_pair() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_blocked_direct_room_participant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.users_have_block(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_block(uuid, uuid, boolean) TO service_role;

COMMENT ON TABLE public.user_blocks IS
  'Directional user blocks. Either direction prevents new direct interaction and Room invitations.';
