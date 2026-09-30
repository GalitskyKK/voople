-- Direct calls use one immutable Core LiveSession. This migration is additive;
-- the legacy chat_rooms contract remains available to released clients.
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS direct_recipient_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS direct_request_id uuid,
  ADD COLUMN IF NOT EXISTS ring_expires_at timestamp,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp,
  ADD COLUMN IF NOT EXISTS terminal_reason varchar(20);

ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_status_check;
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_status_check
  CHECK (status IN ('connecting', 'ringing', 'active', 'grace', 'ended'));
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_direct_call_facts_check
  CHECK (kind <> 'direct_call' OR (
    direct_recipient_id IS NOT NULL AND direct_request_id IS NOT NULL
    AND ring_expires_at IS NOT NULL
    AND (terminal_reason IS NULL OR terminal_reason IN ('ended', 'declined', 'cancelled', 'missed'))
  )) NOT VALID;
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_direct_terminal_check
  CHECK (kind <> 'direct_call' OR ((ended_at IS NULL) = (terminal_reason IS NULL))) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_direct_request_unique
  ON public.live_sessions (started_by, direct_request_id)
  WHERE kind = 'direct_call';
CREATE INDEX IF NOT EXISTS live_sessions_direct_recipient_state_idx
  ON public.live_sessions (direct_recipient_id, ring_expires_at)
  WHERE kind = 'direct_call' AND ended_at IS NULL;

-- Existing Group Room switches may release a Core participant. A direct call
-- requires an explicit session-bound finish so its terminal reason is recorded.
CREATE OR REPLACE FUNCTION public.prevent_implicit_direct_call_leave()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.left_at IS NULL AND NEW.left_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE id = OLD.session_id AND kind = 'direct_call' AND ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'DIRECT_CALL_CONTEXT_CONFIRMATION_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_implicit_direct_call_leave ON public.live_session_participants;
CREATE TRIGGER prevent_implicit_direct_call_leave
  BEFORE UPDATE OF left_at ON public.live_session_participants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_implicit_direct_call_leave();

-- Released clients still enter through chat_room_participants. This guard
-- closes the race between legacy admission and a Core direct reservation.
CREATE OR REPLACE FUNCTION public.guard_legacy_voice_admission()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 911));
  IF EXISTS (SELECT 1 FROM public.live_session_participants
      WHERE user_id = NEW.user_id AND left_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.live_sessions
      WHERE kind = 'direct_call' AND status = 'ringing' AND ended_at IS NULL
        AND ring_expires_at > now() AND direct_recipient_id = NEW.user_id) THEN
    RAISE EXCEPTION 'DIRECT_CALL_BUSY';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_legacy_voice_admission ON public.chat_room_participants;
CREATE TRIGGER guard_legacy_voice_admission
  BEFORE INSERT OR UPDATE OF user_id ON public.chat_room_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_legacy_voice_admission();

CREATE OR REPLACE FUNCTION public.guard_group_voice_from_direct_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.left_at IS NOT NULL OR NOT EXISTS (
    SELECT 1 FROM public.live_sessions WHERE id = NEW.session_id AND kind = 'group_room'
  ) THEN RETURN NEW; END IF;
  -- join_group_room already takes this user's actor lock.
  IF EXISTS (SELECT 1 FROM public.live_sessions
    WHERE kind = 'direct_call' AND status = 'ringing' AND ended_at IS NULL
      AND ring_expires_at > now() AND direct_recipient_id = NEW.user_id) THEN
    RAISE EXCEPTION 'DIRECT_CALL_BUSY';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_group_voice_from_direct_reservation ON public.live_session_participants;
CREATE TRIGGER guard_group_voice_from_direct_reservation
  BEFORE INSERT OR UPDATE OF left_at ON public.live_session_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_group_voice_from_direct_reservation();

CREATE OR REPLACE FUNCTION public.lock_voice_pair_on_block()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_user_id uuid;
BEGIN
  FOR v_user_id IN SELECT unnest(ARRAY[NEW.blocker_id, NEW.blocked_id]) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 911));
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lock_voice_pair_on_block ON public.user_blocks;
CREATE TRIGGER lock_voice_pair_on_block
  BEFORE INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.lock_voice_pair_on_block();

-- A safe realtime projection: users can see only their own call state and no
-- provider identity or credentials. Application RPCs own all writes.
CREATE TABLE IF NOT EXISTS public.direct_call_signals (
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL CHECK (status IN ('ringing', 'active', 'ended')),
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS direct_call_signals_user_updated_idx
  ON public.direct_call_signals (user_id, updated_at DESC);
ALTER TABLE public.direct_call_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.direct_call_signals FROM anon, authenticated;
GRANT SELECT ON TABLE public.direct_call_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.direct_call_signals TO service_role;
CREATE POLICY direct_call_signals_self_read ON public.direct_call_signals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_call_signals;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

-- Timeline writes share the same transaction as the authoritative lifecycle.
-- The ID is derived from the immutable session and event, so retries cannot
-- create a second history row.
CREATE OR REPLACE FUNCTION public.write_core_direct_call_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_event text;
  v_hex text;
  v_id uuid;
  v_duration integer;
  v_text text;
BEGIN
  IF NEW.kind <> 'direct_call' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    v_event := 'started';
  ELSIF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
    v_event := NEW.terminal_reason;
  ELSE
    RETURN NEW;
  END IF;
  v_hex := md5(NEW.id::text || ':' || v_event);
  v_id := (substr(v_hex, 1, 8) || '-' || substr(v_hex, 9, 4) || '-5' ||
    substr(v_hex, 14, 3) || '-a' || substr(v_hex, 18, 3) || '-' || substr(v_hex, 21, 12))::uuid;
  v_duration := CASE WHEN v_event = 'ended'
    THEN greatest(0, round(extract(epoch FROM (now() - coalesce(NEW.accepted_at, NEW.started_at))))::integer)
    ELSE NULL END;
  v_text := CASE v_event
    WHEN 'started' THEN 'Начат звонок'
    WHEN 'ended' THEN 'Встреча завершена · ' || v_duration || ' сек.'
    WHEN 'declined' THEN 'Звонок отклонён'
    WHEN 'cancelled' THEN 'Звонок отменён'
    ELSE 'Пропущенный звонок' END;
  INSERT INTO public.messages (id, chat_id, sender_id, text, content, created_at)
  VALUES (v_id, NEW.conversation_id, NEW.started_by, v_text,
    jsonb_build_array(jsonb_build_object('type', 'roomEvent', 'event', v_event,
      'durationSeconds', v_duration, 'roomKind', 'direct')), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS write_core_direct_call_timeline ON public.live_sessions;
CREATE TRIGGER write_core_direct_call_timeline
  AFTER INSERT OR UPDATE OF status ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.write_core_direct_call_timeline();

CREATE OR REPLACE FUNCTION public.start_core_direct_call(
  p_conversation_id uuid, p_caller_id uuid, p_request_id uuid,
  p_expected_recipient_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_recipient_id uuid;
  v_member_count integer;
  v_user_id uuid;
  v_existing public.live_sessions%ROWTYPE;
  v_created public.live_sessions%ROWTYPE;
  v_now timestamp := now();
BEGIN
  SELECT count(*), min(user_id) FILTER (WHERE user_id <> p_caller_id)
  INTO v_member_count, v_recipient_id
  FROM public.chat_members WHERE chat_id = p_conversation_id;
  IF v_member_count <> 2 OR v_recipient_id IS NULL OR v_recipient_id <> p_expected_recipient_id
    OR NOT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = p_conversation_id AND user_id = p_caller_id)
    OR NOT EXISTS (SELECT 1 FROM public.chats WHERE id = p_conversation_id AND type = 'direct') THEN
    RAISE EXCEPTION 'DIRECT_CALL_FORBIDDEN';
  END IF;

  -- The same actor lock is used by Core Group Room admission. UUID ordering
  -- makes opposing starts and competing callers deadlock-free.
  FOR v_user_id IN SELECT unnest(ARRAY[p_caller_id, v_recipient_id]) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 911));
  END LOOP;

  SELECT count(*) INTO v_member_count FROM (
    SELECT user_id FROM public.chat_members
    WHERE chat_id = p_conversation_id FOR SHARE
  ) AS locked_members;
  IF v_member_count <> 2 OR NOT EXISTS (
    SELECT 1 FROM public.chat_members WHERE chat_id = p_conversation_id AND user_id = p_caller_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.chat_members WHERE chat_id = p_conversation_id AND user_id = v_recipient_id
  ) OR v_recipient_id <> p_expected_recipient_id THEN RAISE EXCEPTION 'DIRECT_CALL_FORBIDDEN'; END IF;

  SELECT * INTO v_existing FROM public.live_sessions
  WHERE kind = 'direct_call' AND started_by = p_caller_id
    AND direct_request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.conversation_id <> p_conversation_id THEN RAISE EXCEPTION 'DIRECT_CALL_REQUEST_CONFLICT'; END IF;
    RETURN jsonb_build_object('sessionId', v_existing.id, 'providerSessionId', v_existing.provider_session_id,
      'status', v_existing.status, 'recipientId', v_existing.direct_recipient_id, 'reused', true);
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_caller_id AND blocked_id = v_recipient_id)
       OR (blocker_id = v_recipient_id AND blocked_id = p_caller_id)) THEN
    RAISE EXCEPTION 'DIRECT_CALL_BLOCKED';
  END IF;

  SELECT * INTO v_existing FROM public.live_sessions
  WHERE kind = 'direct_call' AND conversation_id = p_conversation_id AND ended_at IS NULL
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status = 'ringing' AND v_existing.ring_expires_at > v_now THEN
      RETURN jsonb_build_object('sessionId', v_existing.id, 'providerSessionId', v_existing.provider_session_id,
        'status', v_existing.status, 'recipientId', v_existing.direct_recipient_id, 'reused', true);
    END IF;
    IF v_existing.status <> 'ringing' THEN RAISE EXCEPTION 'DIRECT_CALL_BUSY'; END IF;
    UPDATE public.live_sessions SET status = 'ended', terminal_reason = 'missed',
      ended_at = v_now, updated_at = v_now WHERE id = v_existing.id;
    UPDATE public.live_session_participants SET left_at = v_now
      WHERE session_id = v_existing.id AND left_at IS NULL;
    UPDATE public.direct_call_signals SET status = 'ended', updated_at = v_now
      WHERE session_id = v_existing.id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.live_session_participants
    WHERE user_id IN (p_caller_id, v_recipient_id) AND left_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.live_sessions
      WHERE kind = 'direct_call' AND ended_at IS NULL AND status = 'ringing'
        AND ring_expires_at > v_now
        AND (started_by IN (p_caller_id, v_recipient_id)
          OR direct_recipient_id IN (p_caller_id, v_recipient_id)))
    OR EXISTS (SELECT 1 FROM public.chat_room_participants AS participant
      JOIN public.chat_rooms AS room ON room.chat_id = participant.chat_id
      WHERE participant.user_id IN (p_caller_id, v_recipient_id)
        AND room.status IN ('ringing', 'active')) THEN
    RAISE EXCEPTION 'DIRECT_CALL_BUSY';
  END IF;

  INSERT INTO public.live_sessions (conversation_id, kind, status, started_by,
    direct_recipient_id, direct_request_id, ring_expires_at)
  VALUES (p_conversation_id, 'direct_call', 'ringing', p_caller_id,
    v_recipient_id, p_request_id, v_now + interval '45 seconds')
  RETURNING * INTO v_created;
  INSERT INTO public.live_session_participants (session_id, user_id)
  VALUES (v_created.id, p_caller_id);
  INSERT INTO public.direct_call_signals (session_id, user_id, conversation_id, status)
  VALUES (v_created.id, p_caller_id, p_conversation_id, 'ringing'),
    (v_created.id, v_recipient_id, p_conversation_id, 'ringing');
  RETURN jsonb_build_object('sessionId', v_created.id, 'providerSessionId', v_created.provider_session_id,
    'status', 'ringing', 'recipientId', v_recipient_id, 'reused', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_core_direct_call(
  p_session_id uuid, p_recipient_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_session public.live_sessions%ROWTYPE;
  v_user_id uuid;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session_id AND kind = 'direct_call';
  IF NOT FOUND OR v_session.direct_recipient_id <> p_recipient_id THEN RAISE EXCEPTION 'DIRECT_CALL_FORBIDDEN'; END IF;
  FOR v_user_id IN SELECT unnest(ARRAY[v_session.started_by, p_recipient_id]) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 911));
  END LOOP;
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.status = 'active' AND v_session.ended_at IS NULL THEN
    RETURN jsonb_build_object('sessionId', v_session.id, 'providerSessionId', v_session.provider_session_id, 'status', 'active');
  END IF;
  IF v_session.status <> 'ringing' OR v_session.ended_at IS NOT NULL
    OR v_session.ring_expires_at <= now() THEN RAISE EXCEPTION 'DIRECT_CALL_EXPIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.live_session_participants
    WHERE session_id = p_session_id AND user_id = v_session.started_by AND left_at IS NULL) THEN
    RAISE EXCEPTION 'DIRECT_CALL_EXPIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_session.started_by AND blocked_id = p_recipient_id)
       OR (blocker_id = p_recipient_id AND blocked_id = v_session.started_by))
    OR NOT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = v_session.conversation_id AND user_id = p_recipient_id)
    OR NOT EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = v_session.conversation_id AND user_id = v_session.started_by) THEN
    RAISE EXCEPTION 'DIRECT_CALL_FORBIDDEN';
  END IF;
  IF EXISTS (SELECT 1 FROM public.live_session_participants
    WHERE user_id = p_recipient_id AND left_at IS NULL AND session_id <> p_session_id)
    OR EXISTS (SELECT 1 FROM public.chat_room_participants AS participant
      JOIN public.chat_rooms AS room ON room.chat_id = participant.chat_id
      WHERE participant.user_id = p_recipient_id AND room.status IN ('ringing', 'active')) THEN
    RAISE EXCEPTION 'DIRECT_CALL_BUSY';
  END IF;
  INSERT INTO public.live_session_participants (session_id, user_id) VALUES (p_session_id, p_recipient_id);
  UPDATE public.live_sessions SET status = 'active', accepted_at = now(), updated_at = now() WHERE id = p_session_id;
  UPDATE public.direct_call_signals SET status = 'active', updated_at = now() WHERE session_id = p_session_id;
  RETURN jsonb_build_object('sessionId', v_session.id, 'providerSessionId', v_session.provider_session_id, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_core_direct_call(
  p_session_id uuid, p_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_session public.live_sessions%ROWTYPE;
  v_reason varchar(20);
  v_user_id uuid;
BEGIN
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session_id AND kind = 'direct_call';
  IF NOT FOUND OR p_actor_id NOT IN (v_session.started_by, v_session.direct_recipient_id) THEN
    RAISE EXCEPTION 'DIRECT_CALL_FORBIDDEN';
  END IF;
  FOR v_user_id IN SELECT unnest(ARRAY[v_session.started_by, v_session.direct_recipient_id]) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 911));
  END LOOP;
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.ended_at IS NOT NULL THEN
    RETURN jsonb_build_object('sessionId', v_session.id, 'reason', v_session.terminal_reason, 'changed', false);
  END IF;
  v_reason := CASE WHEN v_session.status = 'ringing' AND v_session.ring_expires_at <= now() THEN 'missed'
    WHEN v_session.status = 'ringing' THEN
    CASE WHEN p_actor_id = v_session.started_by THEN 'cancelled' ELSE 'declined' END
    ELSE 'ended' END;
  UPDATE public.live_sessions SET status = 'ended', terminal_reason = v_reason,
    ended_at = now(), updated_at = now() WHERE id = p_session_id;
  UPDATE public.live_session_participants SET left_at = now() WHERE session_id = p_session_id AND left_at IS NULL;
  UPDATE public.direct_call_signals SET status = 'ended', updated_at = now() WHERE session_id = p_session_id;
  RETURN jsonb_build_object('sessionId', v_session.id, 'reason', v_reason, 'changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_core_direct_calls(p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_count integer := 0; v_session public.live_sessions%ROWTYPE; v_user_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.live_sessions
    WHERE kind = 'direct_call' AND status = 'ringing' AND ended_at IS NULL
      AND ring_expires_at <= now()
    ORDER BY ring_expires_at LIMIT LEAST(GREATEST(p_limit, 0), 100)
  LOOP
    SELECT * INTO v_session FROM public.live_sessions WHERE id = v_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    FOR v_user_id IN SELECT unnest(ARRAY[v_session.started_by, v_session.direct_recipient_id]) ORDER BY 1 LOOP
      PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 911));
    END LOOP;
    SELECT * INTO v_session FROM public.live_sessions WHERE id = v_id FOR UPDATE;
    IF v_session.status <> 'ringing' OR v_session.ended_at IS NOT NULL
      OR v_session.ring_expires_at > now() THEN CONTINUE; END IF;
    UPDATE public.live_sessions SET status = 'ended', terminal_reason = 'missed',
      ended_at = now(), updated_at = now() WHERE id = v_id;
    UPDATE public.live_session_participants SET left_at = now() WHERE session_id = v_id AND left_at IS NULL;
    UPDATE public.direct_call_signals SET status = 'ended', updated_at = now() WHERE session_id = v_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.start_core_direct_call(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.answer_core_direct_call(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_core_direct_call(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_core_direct_calls(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_core_direct_call(uuid, uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.answer_core_direct_call(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_core_direct_call(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_core_direct_calls(integer) TO service_role;
