-- Independent font boundary. No rows, subscriptions or grants are rewritten.
CREATE OR REPLACE FUNCTION public.guard_nickname_font_browser_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.nickname_font IS NOT NULL AND NEW.nickname_font <> 'sans' THEN
        RAISE EXCEPTION 'Premium nickname font changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.nickname_font IS DISTINCT FROM OLD.nickname_font
      AND NEW.nickname_font IS NOT NULL AND NEW.nickname_font <> 'sans' THEN
      RAISE EXCEPTION 'Premium nickname font changes require the trusted server' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_nickname_font_browser_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nickname_font_browser_write() TO service_role;
DROP TRIGGER IF EXISTS nickname_font_browser_write_boundary ON public.profile_customization;
CREATE TRIGGER nickname_font_browser_write_boundary
BEFORE INSERT OR UPDATE ON public.profile_customization
FOR EACH ROW EXECUTE FUNCTION public.guard_nickname_font_browser_write();
ALTER TABLE public.profile_customization ENABLE ALWAYS TRIGGER nickname_font_browser_write_boundary;

-- Aggregate distinct subjects into one JSON value: overlapping grants must not
-- exhaust PostgREST's row limit and silently deny later subjects in the batch.
CREATE OR REPLACE FUNCTION public.load_active_style_subjects(p_user_ids uuid[], p_evaluated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_user_ids IS NULL OR cardinality(p_user_ids) > 200 OR p_evaluated_at IS NULL
    OR NOT isfinite(p_evaluated_at) OR array_position(p_user_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid Style subject batch' USING ERRCODE = '22023';
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(subject.user_id ORDER BY subject.user_id), '[]'::jsonb)
    FROM (
      SELECT DISTINCT g.user_id FROM public.personal_plan_grants g
      WHERE g.user_id = ANY(p_user_ids) AND g.plan_kind = 'style'
        AND g.revoked_at IS NULL AND g.valid_from <= p_evaluated_at AND p_evaluated_at < g.valid_until
    ) subject
  );
END;
$$;
REVOKE ALL ON FUNCTION public.load_active_style_subjects(uuid[], timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_active_style_subjects(uuid[], timestamptz) TO service_role;

-- BEGIN NICKNAME FONT READ-ONLY VALIDATION
DO $$
DECLARE guard oid := to_regprocedure('public.guard_nickname_font_browser_write()');
DECLARE coverage oid := to_regprocedure('public.load_active_style_subjects(uuid[],timestamptz)');
BEGIN
  IF guard IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = guard AND NOT prosecdef AND prorettype = 'trigger'::regtype
      AND proconfig = ARRAY['search_path=pg_catalog'] AND provolatile = 'v' AND pronargs = 0
      AND prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profile_customization'::regclass
      AND tgname = 'nickname_font_browser_write_boundary' AND tgfoid = guard
      AND tgtype = 23 AND tgenabled = 'A' AND NOT tgisinternal AND tgqual IS NULL AND tgnargs = 0
      AND tgattr::text = ''
  ) OR coverage IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = coverage AND NOT prosecdef AND prorettype = 'jsonb'::regtype
      AND proconfig = ARRAY['search_path=pg_catalog'] AND provolatile = 's' AND pronargs = 2
      AND proargnames = ARRAY['p_user_ids', 'p_evaluated_at'] AND pronargdefaults = 0
      AND prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  ) THEN
    RAISE EXCEPTION 'Nickname font boundary missing or incompatible';
  END IF;
  IF has_function_privilege('anon', coverage, 'EXECUTE')
    OR has_function_privilege('authenticated', coverage, 'EXECUTE')
    OR has_function_privilege('anon', guard, 'EXECUTE')
    OR has_function_privilege('authenticated', guard, 'EXECUTE')
    OR NOT has_function_privilege('service_role', coverage, 'EXECUTE')
    OR NOT has_function_privilege('service_role', guard, 'EXECUTE') THEN
    RAISE EXCEPTION 'Nickname font privileges incompatible';
  END IF;
END;
$$;
-- END NICKNAME FONT READ-ONLY VALIDATION
