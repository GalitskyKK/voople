-- Independent effect boundary. No rows, subscriptions or grants are rewritten.
CREATE OR REPLACE FUNCTION public.guard_nickname_effect_browser_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF (NEW.nickname_effect IS NOT NULL AND NEW.nickname_effect <> 'plain') OR NEW.nickname_gradient IS TRUE THEN
        RAISE EXCEPTION 'Premium nickname effect changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF (NEW.nickname_effect IS DISTINCT FROM OLD.nickname_effect
      AND NEW.nickname_effect IS NOT NULL AND NEW.nickname_effect <> 'plain')
      OR (NEW.nickname_gradient IS DISTINCT FROM OLD.nickname_gradient AND NEW.nickname_gradient IS TRUE) THEN
      RAISE EXCEPTION 'Premium nickname effect changes require the trusted server' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_nickname_effect_browser_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nickname_effect_browser_write() TO service_role;
DROP TRIGGER IF EXISTS nickname_effect_browser_write_boundary ON public.profile_customization;
CREATE TRIGGER nickname_effect_browser_write_boundary
BEFORE INSERT OR UPDATE ON public.profile_customization
FOR EACH ROW EXECUTE FUNCTION public.guard_nickname_effect_browser_write();
ALTER TABLE public.profile_customization ENABLE ALWAYS TRIGGER nickname_effect_browser_write_boundary;

-- BEGIN NICKNAME EFFECT READ-ONLY VALIDATION
DO $$
DECLARE guard oid := to_regprocedure('public.guard_nickname_effect_browser_write()');
BEGIN
  IF guard IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = guard AND NOT prosecdef AND prorettype = 'trigger'::regtype
      AND proconfig = ARRAY['search_path=pg_catalog'] AND provolatile = 'v' AND pronargs = 0
      AND prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profile_customization'::regclass
      AND tgname = 'nickname_effect_browser_write_boundary' AND tgfoid = guard
      AND tgtype = 23 AND tgenabled = 'A' AND NOT tgisinternal AND tgqual IS NULL AND tgnargs = 0
      AND tgattr::text = ''
  ) THEN
    RAISE EXCEPTION 'Nickname effect boundary missing or incompatible';
  END IF;
  IF has_function_privilege('anon', guard, 'EXECUTE')
    OR has_function_privilege('authenticated', guard, 'EXECUTE')
    OR NOT has_function_privilege('service_role', guard, 'EXECUTE') THEN
    RAISE EXCEPTION 'Nickname effect privileges incompatible';
  END IF;
END;
$$;
-- END NICKNAME EFFECT READ-ONLY VALIDATION
