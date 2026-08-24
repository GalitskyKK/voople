-- Enforce connection-request privacy inside the atomic direct-chat RPC.
-- Existing conversations remain accessible; only creation of a new pair is gated.

CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(
  p_current_user uuid,
  p_other_user uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_low uuid;
  v_user_high uuid;
  v_chat_id uuid;
  v_created_chat_id uuid;
  v_pair_created boolean := false;
  v_connection_scope text;
BEGIN
  IF p_current_user IS NULL OR p_other_user IS NULL THEN
    RAISE EXCEPTION 'User ids are required';
  END IF;

  IF p_current_user = p_other_user THEN
    RAISE EXCEPTION 'Cannot create a direct chat with yourself';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_current_user) THEN
    RAISE EXCEPTION 'Current user does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_other_user) THEN
    RAISE EXCEPTION 'Other user does not exist';
  END IF;

  IF p_current_user::text < p_other_user::text THEN
    v_user_low := p_current_user;
    v_user_high := p_other_user;
  ELSE
    v_user_low := p_other_user;
    v_user_high := p_current_user;
  END IF;

  SELECT chat_id
  INTO v_chat_id
  FROM public.direct_chat_pairs
  WHERE user_low_id = v_user_low
    AND user_high_id = v_user_high;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  SELECT COALESCE(connection_request_scope, 'everyone')
  INTO v_connection_scope
  FROM public.user_privacy_settings
  WHERE user_id = p_other_user;

  IF NOT public.privacy_scope_allows(
    p_other_user,
    p_current_user,
    COALESCE(v_connection_scope, 'everyone')
  ) THEN
    RAISE EXCEPTION 'Connection requests are restricted';
  END IF;

  INSERT INTO public.chats (type)
  VALUES ('direct')
  RETURNING id INTO v_created_chat_id;

  BEGIN
    INSERT INTO public.direct_chat_pairs (chat_id, user_low_id, user_high_id)
    VALUES (v_created_chat_id, v_user_low, v_user_high);

    v_chat_id := v_created_chat_id;
    v_pair_created := true;
  EXCEPTION
    WHEN unique_violation THEN
      DELETE FROM public.chats WHERE id = v_created_chat_id;

      SELECT chat_id
      INTO v_chat_id
      FROM public.direct_chat_pairs
      WHERE user_low_id = v_user_low
        AND user_high_id = v_user_high;
  END;

  IF v_chat_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve direct chat';
  END IF;

  IF v_pair_created THEN
    INSERT INTO public.chat_members (chat_id, user_id)
    VALUES
      (v_chat_id, p_current_user),
      (v_chat_id, p_other_user)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_chat_id;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.get_or_create_direct_chat(uuid, uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid, uuid) TO service_role;
