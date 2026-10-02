-- Security boundary only. No rows or saved preferences are rewritten.
-- SECURITY INVOKER observes the actual SQL role selected by PostgREST, not JWT claims.
CREATE OR REPLACE FUNCTION public.guard_app_theme_browser_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.app_theme_id IS NOT NULL THEN
        RAISE EXCEPTION 'Account theme changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.app_theme_id IS DISTINCT FROM OLD.app_theme_id THEN
      RAISE EXCEPTION 'Account theme changes require the trusted server' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_app_theme_browser_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_app_theme_browser_write() TO service_role;

DROP TRIGGER IF EXISTS app_theme_browser_write_boundary ON public.profile_customization;
CREATE TRIGGER app_theme_browser_write_boundary
BEFORE INSERT OR UPDATE ON public.profile_customization
FOR EACH ROW EXECUTE FUNCTION public.guard_app_theme_browser_write();
ALTER TABLE public.profile_customization ENABLE ALWAYS TRIGGER app_theme_browser_write_boundary;

-- BEGIN APP THEME READ-ONLY VALIDATION
DO $$
DECLARE fn oid := to_regprocedure('public.guard_app_theme_browser_write()');
BEGIN
  IF fn IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = fn AND NOT prosecdef AND prorettype = 'trigger'::regtype
      AND proconfig = ARRAY['search_path=pg_catalog']
      AND prosrc LIKE '%current_user IN (''anon'', ''authenticated'')%'
      AND prosrc LIKE '%TG_OP = ''INSERT''%'
      AND prosrc LIKE '%NEW.app_theme_id IS NOT NULL%'
      AND prosrc LIKE '%NEW.app_theme_id IS DISTINCT FROM OLD.app_theme_id%'
      AND prosrc LIKE '%42501%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profile_customization'::regclass
      AND tgname = 'app_theme_browser_write_boundary' AND tgfoid = fn
      AND tgtype = 23 AND tgenabled = 'A' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'App theme browser write boundary missing or incompatible';
  END IF;
END;
$$;
-- END APP THEME READ-ONLY VALIDATION
