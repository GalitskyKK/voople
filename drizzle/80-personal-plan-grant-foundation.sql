-- Independent personal-plan facts. No issuance, billing or legacy backfill.
CREATE TABLE public.personal_plan_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_kind varchar(16) NOT NULL CONSTRAINT personal_plan_grants_kind CHECK (plan_kind IN ('style', 'full')),
  source_reference varchar(200) NOT NULL UNIQUE CONSTRAINT personal_plan_grants_source CHECK (
    length(btrim(source_reference)) > 0 AND source_reference = btrim(source_reference)
    AND source_reference !~ '^[[:space:]]|[[:space:]]$'
  ),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_plan_grants_validity CHECK (
    isfinite(valid_from) AND isfinite(valid_until) AND valid_until > valid_from
  )
);
CREATE INDEX personal_plan_grants_active_user_idx
  ON public.personal_plan_grants(user_id, valid_until) WHERE revoked_at IS NULL;

ALTER TABLE public.personal_plan_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.personal_plan_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal_plan_grants TO service_role;

-- Aggregate in SQL so PostgREST cannot truncate a user's coverage facts.
CREATE FUNCTION public.load_active_personal_plan_grants(p_user_id uuid, p_evaluated_at timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'user_id', user_id, 'plan_kind', plan_kind,
    'valid_from', valid_from, 'valid_until', valid_until, 'revoked_at', revoked_at
  ) ORDER BY id), '[]'::jsonb)
  FROM public.personal_plan_grants
  WHERE user_id = p_user_id AND revoked_at IS NULL
    AND valid_from <= p_evaluated_at AND p_evaluated_at < valid_until;
$$;
REVOKE ALL ON FUNCTION public.load_active_personal_plan_grants(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_active_personal_plan_grants(uuid, timestamptz) TO service_role;

COMMENT ON TABLE public.personal_plan_grants IS
  'Provider-neutral Style/full grant facts; overlap and precedence remain unresolved. No issuer, billing adapter, legacy migration or entitlement consumer exists.';
