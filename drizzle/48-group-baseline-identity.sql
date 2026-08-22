-- Baseline group identity must stay useful without paid boosts. Random invite
-- links are permanent until an administrator revokes them; vanity addresses
-- and animated treatments remain optional perks.

ALTER TABLE public.chat_invites
  ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE public.chat_invites
  ALTER COLUMN max_uses DROP NOT NULL;

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
    OR (v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= now())
    OR (v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses) THEN
    RAISE EXCEPTION 'Invite is unavailable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = v_invite.chat_id AND user_id = p_user_id
  ) THEN
    RETURN v_invite.chat_id;
  END IF;

  SELECT count(*) INTO v_member_count
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

ALTER TABLE public.chat_audit_log
  DROP CONSTRAINT IF EXISTS chat_audit_log_action_check;
ALTER TABLE public.chat_audit_log
  ADD CONSTRAINT chat_audit_log_action_check CHECK (
    action IN (
      'member_added',
      'member_removed',
      'member_left',
      'role_changed',
      'ownership_transferred',
      'topics_changed',
      'visibility_changed',
      'group_name_changed'
    )
  );

COMMENT ON COLUMN public.chat_invites.expires_at IS
  'NULL means the invite remains active until it is revoked.';
COMMENT ON COLUMN public.chat_invites.max_uses IS
  'NULL means the invite has no use-count limit.';
