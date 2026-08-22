-- Three visibility levels and a separate join policy keep discovery and
-- membership rules independent. Existing groups preserve their behaviour.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chats'
      AND column_name = 'join_policy'
  ) THEN
    ALTER TABLE public.chats
      ADD COLUMN join_policy varchar(20) NOT NULL DEFAULT 'invite_only';

    UPDATE public.chats
    SET join_policy = CASE WHEN group_visibility = 'public' THEN 'open' ELSE 'invite_only' END
    WHERE type = 'group' AND parent_chat_id IS NULL;
  END IF;
END
$$;

ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_group_visibility_check;
ALTER TABLE public.chats ADD CONSTRAINT chats_group_visibility_check
  CHECK (group_visibility IN ('private', 'unlisted', 'public'));
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_join_policy_check;
ALTER TABLE public.chats ADD CONSTRAINT chats_join_policy_check
  CHECK (join_policy IN ('open', 'request', 'invite_only'));

CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS group_join_requests_pending_unique
  ON public.group_join_requests(chat_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS group_join_requests_chat_created_idx
  ON public.group_join_requests(chat_id, created_at DESC);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.group_join_requests FROM anon, authenticated;
GRANT ALL ON TABLE public.group_join_requests TO service_role;

CREATE OR REPLACE FUNCTION public.request_group_membership(p_chat_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat public.chats%ROWTYPE;
  v_member_count integer;
BEGIN
  SELECT * INTO v_chat FROM public.chats
  WHERE id = p_chat_id AND type = 'group' AND parent_chat_id IS NULL FOR UPDATE;
  IF v_chat.id IS NULL OR v_chat.group_visibility = 'private' THEN
    RAISE EXCEPTION 'Group is unavailable';
  END IF;
  IF EXISTS (SELECT 1 FROM public.chat_members WHERE chat_id = p_chat_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('chatId', p_chat_id, 'status', 'joined');
  END IF;
  IF v_chat.join_policy = 'invite_only' THEN RAISE EXCEPTION 'Invite is required'; END IF;
  IF v_chat.join_policy = 'request' THEN
    INSERT INTO public.group_join_requests(chat_id, user_id)
    VALUES (p_chat_id, p_user_id)
    ON CONFLICT (chat_id, user_id) WHERE status = 'pending' DO NOTHING;
    RETURN jsonb_build_object('chatId', p_chat_id, 'status', 'requested');
  END IF;
  SELECT count(*) INTO v_member_count FROM public.chat_members WHERE chat_id = p_chat_id;
  IF v_member_count >= 20 THEN RAISE EXCEPTION 'Group is full'; END IF;
  INSERT INTO public.chat_members(chat_id, user_id, role) VALUES (p_chat_id, p_user_id, 'member');
  RETURN jsonb_build_object('chatId', p_chat_id, 'status', 'joined');
END;
$$;

REVOKE ALL ON FUNCTION public.request_group_membership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_group_membership(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_group_join_request(
  p_request_id uuid,
  p_actor_id uuid,
  p_approve boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.group_join_requests%ROWTYPE;
  v_role varchar(20);
  v_member_count integer;
BEGIN
  SELECT * INTO v_request FROM public.group_join_requests
  WHERE id = p_request_id AND status = 'pending' FOR UPDATE;
  IF v_request.id IS NULL THEN RAISE EXCEPTION 'Join request is unavailable'; END IF;

  SELECT role INTO v_role FROM public.chat_members
  WHERE chat_id = v_request.chat_id AND user_id = p_actor_id;
  IF v_role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'Insufficient permissions'; END IF;

  IF p_approve THEN
    SELECT count(*) INTO v_member_count FROM public.chat_members WHERE chat_id = v_request.chat_id;
    IF v_member_count >= 20 THEN RAISE EXCEPTION 'Group is full'; END IF;
    INSERT INTO public.chat_members(chat_id, user_id, role)
    VALUES (v_request.chat_id, v_request.user_id, 'member') ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.group_join_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      resolved_at = now(), resolved_by = p_actor_id
  WHERE id = v_request.id;
  RETURN jsonb_build_object(
    'chatId', v_request.chat_id,
    'userId', v_request.user_id,
    'status', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_group_join_request(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_group_join_request(uuid, uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.join_public_group(p_chat_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT public.request_group_membership(p_chat_id, p_user_id) INTO v_result;
  IF v_result->>'status' <> 'joined' THEN RAISE EXCEPTION 'Join request required'; END IF;
  RETURN (v_result->>'chatId')::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.join_public_group(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_public_group(uuid, uuid) TO service_role;

COMMENT ON COLUMN public.chats.group_visibility IS
  'private: invites only; unlisted: direct link; public: discovery and direct link.';
COMMENT ON COLUMN public.chats.join_policy IS
  'open: immediate join; request: moderator approval; invite_only: valid invite required.';
