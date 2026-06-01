-- Chat hardening: unique direct chats, realtime diagnostics support, stricter client access.
-- Run after 02-rls-policies.sql and 03-realtime-messages.sql.

CREATE TABLE IF NOT EXISTS public.direct_chat_pairs (
  chat_id uuid PRIMARY KEY REFERENCES public.chats(id) ON DELETE CASCADE,
  user_low_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_high_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT direct_chat_pairs_order_check CHECK (user_low_id::text < user_high_id::text),
  CONSTRAINT direct_chat_pairs_users_unique UNIQUE (user_low_id, user_high_id)
);

ALTER TABLE public.direct_chat_pairs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.direct_chat_pairs (chat_id, user_low_id, user_high_id)
SELECT
  chat_id,
  MIN(user_id::text)::uuid AS user_low_id,
  MAX(user_id::text)::uuid AS user_high_id
FROM public.chat_members
WHERE chat_id IN (SELECT id FROM public.chats WHERE type = 'direct')
GROUP BY chat_id
HAVING COUNT(*) = 2
ON CONFLICT (user_low_id, user_high_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS messages_chat_time_idx
  ON public.messages USING btree (chat_id, created_at);

DELETE FROM public.user_inventory a
USING public.user_inventory b
WHERE a.user_id = b.user_id
  AND a.item_id = b.item_id
  AND a.acquired_at <= b.acquired_at
  AND a.ctid < b.ctid;

DROP INDEX IF EXISTS public.inventory_unique;

CREATE UNIQUE INDEX inventory_unique
  ON public.user_inventory USING btree (user_id, item_id);

DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "user_inventory_insert_own" ON public.user_inventory;

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

REVOKE ALL ON FUNCTION public.get_or_create_direct_chat(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid, uuid) TO service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
