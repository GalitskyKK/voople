-- Independent color boundary. No saved values, grants or ACLs are rewritten.
CREATE OR REPLACE FUNCTION public.guard_nickname_color_browser_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.nickname_color IS NOT NULL AND lower(NEW.nickname_color) NOT IN
        ('#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899') THEN
        RAISE EXCEPTION 'Custom nickname color changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.nickname_color IS DISTINCT FROM OLD.nickname_color
      AND NEW.nickname_color IS NOT NULL AND lower(NEW.nickname_color) NOT IN
        ('#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899') THEN
      RAISE EXCEPTION 'Custom nickname color changes require the trusted server' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_nickname_color_browser_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_nickname_color_browser_write() TO service_role;
DROP TRIGGER IF EXISTS nickname_color_browser_write_boundary ON public.profile_customization;
CREATE TRIGGER nickname_color_browser_write_boundary
BEFORE INSERT OR UPDATE ON public.profile_customization
FOR EACH ROW EXECUTE FUNCTION public.guard_nickname_color_browser_write();
ALTER TABLE public.profile_customization ENABLE ALWAYS TRIGGER nickname_color_browser_write_boundary;

-- BEGIN NICKNAME COLOR READ-ONLY VALIDATION
DO $$
DECLARE guard oid := to_regprocedure('public.guard_nickname_color_browser_write()');
BEGIN
  IF guard IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = guard AND NOT prosecdef AND prorettype = 'trigger'::regtype
      AND proconfig = ARRAY['search_path=pg_catalog'] AND provolatile = 'v' AND pronargs = 0
      AND prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profile_customization'::regclass
      AND tgname = 'nickname_color_browser_write_boundary' AND tgfoid = guard
      AND tgtype = 23 AND tgenabled = 'A' AND NOT tgisinternal AND tgqual IS NULL AND tgnargs = 0
      AND tgattr::text = ''
  ) THEN
    RAISE EXCEPTION 'Nickname color boundary missing or incompatible';
  END IF;
  IF has_function_privilege('anon', guard, 'EXECUTE')
    OR has_function_privilege('authenticated', guard, 'EXECUTE')
    OR NOT has_function_privilege('service_role', guard, 'EXECUTE') THEN
    RAISE EXCEPTION 'Nickname color privileges incompatible';
  END IF;
END;
$$;
-- END NICKNAME COLOR READ-ONLY VALIDATION
