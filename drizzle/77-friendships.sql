-- Friend requests are a separate lifecycle from legacy directed follows.
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'friend_request';
--> statement-breakpoint
ALTER TYPE public.notif_type ADD VALUE IF NOT EXISTS 'friend_accept';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_low_id uuid GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
  user_high_id uuid GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friend_requests_not_self CHECK (requester_id <> addressee_id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_one_pending_pair
  ON public.friend_requests (user_low_id, user_high_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS friend_requests_addressee_pending
  ON public.friend_requests (addressee_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS friend_requests_requester_pending
  ON public.friend_requests (requester_id, created_at DESC) WHERE status = 'pending';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.friendships (
  user_low_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_high_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_request_id uuid UNIQUE REFERENCES public.friend_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_low_id, user_high_id),
  CONSTRAINT friendships_ordered_pair CHECK (user_low_id < user_high_id)
);
CREATE INDEX IF NOT EXISTS friendships_high_user_idx ON public.friendships (user_high_id, user_low_id);
--> statement-breakpoint
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.friend_requests, public.friendships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests, public.friendships TO service_role;
--> statement-breakpoint

-- Existing privacy scopes now mean accepted friends, not two legacy follows.
CREATE OR REPLACE FUNCTION public.privacy_scope_allows(p_owner_id uuid, p_viewer_id uuid, p_scope text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN p_owner_id = p_viewer_id THEN true
    WHEN p_scope = 'everyone' THEN true
    WHEN p_viewer_id IS NULL OR p_scope = 'nobody' THEN false
    WHEN p_scope = 'contacts' THEN EXISTS (
      SELECT 1 FROM public.friendships
      WHERE user_low_id = LEAST(p_owner_id, p_viewer_id)
        AND user_high_id = GREATEST(p_owner_id, p_viewer_id)
    )
    WHEN p_scope = 'contacts_and_groups' THEN
      EXISTS (
        SELECT 1 FROM public.friendships
        WHERE user_low_id = LEAST(p_owner_id, p_viewer_id)
          AND user_high_id = GREATEST(p_owner_id, p_viewer_id)
      ) OR EXISTS (
        SELECT 1 FROM public.chat_members owner_member
        JOIN public.chat_members viewer_member ON viewer_member.chat_id = owner_member.chat_id
        JOIN public.chats chat ON chat.id = owner_member.chat_id AND chat.type = 'group'
        WHERE owner_member.user_id = p_owner_id AND viewer_member.user_id = p_viewer_id
      )
    ELSE false
  END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.friend_pair_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_first uuid; v_second uuid;
BEGIN
  IF TG_TABLE_NAME = 'friend_requests' THEN
    IF TG_OP = 'UPDATE' AND (
      NEW.requester_id IS DISTINCT FROM OLD.requester_id
      OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
    ) THEN RAISE EXCEPTION 'FRIEND_REQUEST_PAIR_IMMUTABLE'; END IF;
    IF TG_OP = 'UPDATE' AND NEW.status <> 'pending' THEN RETURN NEW; END IF;
    v_first := NEW.requester_id; v_second := NEW.addressee_id;
  ELSE
    v_first := NEW.user_low_id; v_second := NEW.user_high_id;
  END IF;
  IF v_first = v_second OR public.users_have_block(v_first, v_second) THEN
    RAISE EXCEPTION 'FRIEND_PAIR_BLOCKED';
  END IF;
  IF TG_TABLE_NAME = 'friend_requests' AND NEW.status = 'pending' AND EXISTS (
    SELECT 1 FROM public.friendships WHERE user_low_id = LEAST(v_first, v_second)
      AND user_high_id = GREATEST(v_first, v_second)
  ) THEN RAISE EXCEPTION 'FRIEND_ALREADY_CONNECTED'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS friend_requests_pair_guard ON public.friend_requests;
CREATE TRIGGER friend_requests_pair_guard BEFORE INSERT OR UPDATE OF requester_id, addressee_id, status
  ON public.friend_requests FOR EACH ROW EXECUTE FUNCTION public.friend_pair_guard();
DROP TRIGGER IF EXISTS friendships_pair_guard ON public.friendships;
CREATE TRIGGER friendships_pair_guard BEFORE INSERT OR UPDATE OF user_low_id, user_high_id
  ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.friend_pair_guard();
--> statement-breakpoint

-- Matches set_user_block's pair lock. A direct service-role block insert gets
-- the same cleanup as the existing block RPC; unblock never restores a friend.
CREATE OR REPLACE FUNCTION public.friend_block_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    LEAST(NEW.blocker_id, NEW.blocked_id)::text || GREATEST(NEW.blocker_id, NEW.blocked_id)::text, 918
  ));
  DELETE FROM public.friendships
  WHERE user_low_id = LEAST(NEW.blocker_id, NEW.blocked_id)
    AND user_high_id = GREATEST(NEW.blocker_id, NEW.blocked_id);
  UPDATE public.friend_requests SET status = 'cancelled', responded_at = now(), updated_at = now()
  WHERE user_low_id = LEAST(NEW.blocker_id, NEW.blocked_id)
    AND user_high_id = GREATEST(NEW.blocker_id, NEW.blocked_id)
    AND status = 'pending';
  DELETE FROM public.notifications WHERE type = 'friend_request'
    AND reference_id IN (SELECT id FROM public.friend_requests
      WHERE user_low_id = LEAST(NEW.blocker_id, NEW.blocked_id)
        AND user_high_id = GREATEST(NEW.blocker_id, NEW.blocked_id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_blocks_friend_cleanup ON public.user_blocks;
CREATE TRIGGER user_blocks_friend_cleanup AFTER INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.friend_block_cleanup();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.send_friend_request(p_requester_id uuid, p_addressee_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_request public.friend_requests%ROWTYPE; v_scope text;
BEGIN
  IF p_requester_id IS NULL OR p_addressee_id IS NULL OR p_requester_id = p_addressee_id THEN
    RAISE EXCEPTION 'FRIEND_SELF';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    LEAST(p_requester_id, p_addressee_id)::text || GREATEST(p_requester_id, p_addressee_id)::text, 918
  ));
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_addressee_id) THEN RAISE EXCEPTION 'FRIEND_TARGET_MISSING'; END IF;
  IF public.users_have_block(p_requester_id, p_addressee_id) THEN RAISE EXCEPTION 'FRIEND_PAIR_BLOCKED'; END IF;
  IF EXISTS (SELECT 1 FROM public.friendships WHERE user_low_id = LEAST(p_requester_id, p_addressee_id)
    AND user_high_id = GREATEST(p_requester_id, p_addressee_id)) THEN
    RETURN jsonb_build_object('state', 'friends');
  END IF;
  SELECT * INTO v_request FROM public.friend_requests
  WHERE user_low_id = LEAST(p_requester_id, p_addressee_id)
    AND user_high_id = GREATEST(p_requester_id, p_addressee_id) AND status = 'pending';
  IF FOUND THEN
    RETURN jsonb_build_object('state', CASE WHEN v_request.requester_id = p_requester_id
      THEN 'outgoing_pending' ELSE 'incoming_pending' END, 'requestId', v_request.id);
  END IF;
  SELECT COALESCE(connection_request_scope, 'everyone') INTO v_scope
  FROM public.user_privacy_settings WHERE user_id = p_addressee_id;
  IF NOT public.privacy_scope_allows(p_addressee_id, p_requester_id, COALESCE(v_scope, 'everyone')) THEN
    RAISE EXCEPTION 'FRIEND_PRIVACY_DENIED';
  END IF;
  INSERT INTO public.friend_requests (requester_id, addressee_id)
  VALUES (p_requester_id, p_addressee_id) RETURNING * INTO v_request;
  INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
  VALUES (p_addressee_id, 'friend_request', p_requester_id, v_request.id);
  RETURN jsonb_build_object('state', 'outgoing_pending', 'requestId', v_request.id);
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.respond_friend_request(p_addressee_id uuid, p_request_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_request public.friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.friend_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_request.addressee_id <> p_addressee_id THEN RAISE EXCEPTION 'FRIEND_REQUEST_FORBIDDEN'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_request.user_low_id::text || v_request.user_high_id::text, 918));
  SELECT * INTO v_request FROM public.friend_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.addressee_id <> p_addressee_id THEN RAISE EXCEPTION 'FRIEND_REQUEST_FORBIDDEN'; END IF;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('state', v_request.status);
  END IF;
  IF p_accept AND public.users_have_block(v_request.requester_id, v_request.addressee_id) THEN
    RAISE EXCEPTION 'FRIEND_PAIR_BLOCKED';
  END IF;
  IF p_accept THEN
    INSERT INTO public.friendships (user_low_id, user_high_id, source_request_id)
    VALUES (v_request.user_low_id, v_request.user_high_id, v_request.id)
    ON CONFLICT (user_low_id, user_high_id) DO NOTHING;
  END IF;
  UPDATE public.friend_requests SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
    responded_at = now(), updated_at = now() WHERE id = p_request_id;
  DELETE FROM public.notifications WHERE type = 'friend_request' AND reference_id = p_request_id;
  IF p_accept THEN
    INSERT INTO public.notifications (user_id, type, actor_id, reference_id)
    VALUES (v_request.requester_id, 'friend_accept', p_addressee_id, v_request.id);
  END IF;
  RETURN jsonb_build_object('state', CASE WHEN p_accept THEN 'friends' ELSE 'declined' END);
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_requester_id uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_request public.friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM public.friend_requests WHERE id = p_request_id;
  IF NOT FOUND OR v_request.requester_id <> p_requester_id THEN RAISE EXCEPTION 'FRIEND_REQUEST_FORBIDDEN'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_request.user_low_id::text || v_request.user_high_id::text, 918));
  SELECT * INTO v_request FROM public.friend_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.requester_id <> p_requester_id THEN RAISE EXCEPTION 'FRIEND_REQUEST_FORBIDDEN'; END IF;
  IF v_request.status = 'pending' THEN
    UPDATE public.friend_requests SET status = 'cancelled', responded_at = now(), updated_at = now()
    WHERE id = p_request_id;
    DELETE FROM public.notifications WHERE type = 'friend_request' AND reference_id = p_request_id;
  END IF;
  RETURN jsonb_build_object('state', CASE WHEN v_request.status = 'pending' THEN 'cancelled' ELSE v_request.status END);
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.remove_friend(p_actor_id uuid, p_target_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_actor_id IS NULL OR p_target_id IS NULL OR p_actor_id = p_target_id THEN RAISE EXCEPTION 'FRIEND_SELF'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    LEAST(p_actor_id, p_target_id)::text || GREATEST(p_actor_id, p_target_id)::text, 918
  ));
  DELETE FROM public.friendships WHERE user_low_id = LEAST(p_actor_id, p_target_id)
    AND user_high_id = GREATEST(p_actor_id, p_target_id);
  RETURN true;
END;
$$;
--> statement-breakpoint

-- Pins now mean friends. Legacy non-friend pins are removed, never promoted to friendships.
DELETE FROM public.user_contact_pins AS pin WHERE NOT EXISTS (
  SELECT 1 FROM public.friendships
  WHERE user_low_id = LEAST(pin.user_id, pin.pinned_user_id)
    AND user_high_id = GREATEST(pin.user_id, pin.pinned_user_id)
);
CREATE OR REPLACE FUNCTION public.friend_pin_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.friendships WHERE user_low_id = LEAST(NEW.user_id, NEW.pinned_user_id)
    AND user_high_id = GREATEST(NEW.user_id, NEW.pinned_user_id)) THEN
    RAISE EXCEPTION 'FRIEND_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS contact_pins_friend_guard ON public.user_contact_pins;
CREATE TRIGGER contact_pins_friend_guard BEFORE INSERT OR UPDATE OF user_id, pinned_user_id
  ON public.user_contact_pins FOR EACH ROW EXECUTE FUNCTION public.friend_pin_guard();
CREATE OR REPLACE FUNCTION public.friend_unpin_removed()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public.user_contact_pins WHERE (user_id = OLD.user_low_id AND pinned_user_id = OLD.user_high_id)
    OR (user_id = OLD.user_high_id AND pinned_user_id = OLD.user_low_id);
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS friendships_unpin_removed ON public.friendships;
CREATE TRIGGER friendships_unpin_removed AFTER DELETE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.friend_unpin_removed();
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.friend_pair_guard(), public.friend_block_cleanup(), public.friend_pin_guard(), public.friend_unpin_removed()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_friend_request(uuid, uuid), public.respond_friend_request(uuid, uuid, boolean),
  public.cancel_friend_request(uuid, uuid), public.remove_friend(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid, uuid), public.respond_friend_request(uuid, uuid, boolean),
  public.cancel_friend_request(uuid, uuid), public.remove_friend(uuid, uuid) TO service_role;
