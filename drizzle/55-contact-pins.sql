-- Up to three close-circle pins per user. Server-only mutations keep slot order atomic.

CREATE TABLE IF NOT EXISTS public.user_contact_pins (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pinned_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pinned_user_id),
  UNIQUE (user_id, position),
  CONSTRAINT user_contact_pins_position_check CHECK (position BETWEEN 1 AND 3),
  CONSTRAINT user_contact_pins_not_self_check CHECK (user_id <> pinned_user_id)
);
--> statement-breakpoint

ALTER TABLE public.user_contact_pins ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.user_contact_pins FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE public.user_contact_pins TO service_role;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.toggle_user_contact_pin(p_user_id uuid, p_pinned_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position smallint;
BEGIN
  IF p_user_id = p_pinned_user_id THEN
    RAISE EXCEPTION 'Cannot pin yourself';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_contact_pins WHERE user_id = p_user_id AND pinned_user_id = p_pinned_user_id) THEN
    DELETE FROM public.user_contact_pins WHERE user_id = p_user_id AND pinned_user_id = p_pinned_user_id;
    RETURN false;
  END IF;
  SELECT slot::smallint INTO v_position
  FROM generate_series(1, 3) slot
  WHERE NOT EXISTS (SELECT 1 FROM public.user_contact_pins pin WHERE pin.user_id = p_user_id AND pin.position = slot)
  ORDER BY slot
  LIMIT 1;
  IF v_position IS NULL THEN
    RAISE EXCEPTION 'You can pin at most 3 people';
  END IF;
  INSERT INTO public.user_contact_pins(user_id, pinned_user_id, position)
  VALUES (p_user_id, p_pinned_user_id, v_position);
  RETURN true;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.toggle_user_contact_pin(uuid, uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.toggle_user_contact_pin(uuid, uuid) TO service_role;
