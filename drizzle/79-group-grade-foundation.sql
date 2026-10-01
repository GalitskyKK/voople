-- Independent charge grants. No billing, subscription issuance or Boost backfill.
CREATE TABLE public.group_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  root_group_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  origin varchar(32) NOT NULL CHECK (origin IN ('included_voople_plus', 'standalone')),
  source_reference varchar(200) NOT NULL UNIQUE CHECK (length(btrim(source_reference)) > 0),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  revoked_at timestamptz,
  assigned_at timestamptz,
  moved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_charges_validity CHECK (
    isfinite(valid_from) AND isfinite(valid_until) AND valid_until > valid_from
  ),
  CONSTRAINT group_charges_assignment_times CHECK (
    (assigned_at IS NULL) = (moved_at IS NULL)
    AND (root_group_id IS NULL OR assigned_at IS NOT NULL)
    AND (assigned_at IS NULL OR moved_at >= assigned_at)
  )
);

CREATE UNIQUE INDEX group_charges_one_included_per_owner
  ON public.group_charges(owner_user_id)
  WHERE origin = 'included_voople_plus' AND revoked_at IS NULL;
CREATE INDEX group_charges_active_group_idx
  ON public.group_charges(root_group_id, valid_until)
  WHERE revoked_at IS NULL;

ALTER TABLE public.group_charges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.group_charges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_charges TO service_role;

-- Lock the referenced chat against concurrent conversion into a section/DM.
CREATE FUNCTION public.validate_group_charge_root()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.root_group_id IS NOT NULL THEN
    PERFORM 1 FROM public.chats
      WHERE id = NEW.root_group_id AND type = 'group' AND parent_chat_id IS NULL
      FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'group_charge_root_required'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER group_charges_validate_root
  BEFORE INSERT OR UPDATE OF root_group_id ON public.group_charges
  FOR EACH ROW EXECUTE FUNCTION public.validate_group_charge_root();

CREATE FUNCTION public.preserve_group_charge_root()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (NEW.type <> 'group' OR NEW.parent_chat_id IS NOT NULL)
    AND EXISTS (SELECT 1 FROM public.group_charges WHERE root_group_id = OLD.id) THEN
    RAISE EXCEPTION 'group_charge_root_required';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER chats_preserve_charge_root
  BEFORE UPDATE OF type, parent_chat_id ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.preserve_group_charge_root();

-- JSON aggregation avoids the REST row cap; all records use one SQL snapshot.
CREATE FUNCTION public.load_active_group_charges(p_root_group_id uuid, p_evaluated_at timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'owner_user_id', owner_user_id, 'root_group_id', root_group_id,
    'origin', origin, 'valid_from', valid_from, 'valid_until', valid_until,
    'revoked_at', revoked_at
  ) ORDER BY id), '[]'::jsonb)
  FROM public.group_charges
  WHERE root_group_id = p_root_group_id AND revoked_at IS NULL
    AND valid_from <= p_evaluated_at AND p_evaluated_at < valid_until;
$$;

REVOKE ALL ON FUNCTION public.validate_group_charge_root() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preserve_group_charge_root() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.load_active_group_charges(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_active_group_charges(uuid, timestamptz) TO service_role;

COMMENT ON TABLE public.group_charges IS
  'Provider-neutral charge grants; Grade is derived, never persisted. Included grants require a future full-Voople+ lifecycle adapter; existing subscriptions do not issue grants.';
