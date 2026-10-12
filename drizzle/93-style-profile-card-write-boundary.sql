-- Independent profile/card boundary. No saved values, grants or ACLs are rewritten.
CREATE OR REPLACE FUNCTION public.guard_profile_card_browser_write()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.profile_frame_id IS NOT NULL AND NEW.profile_frame_id NOT IN ('frame-slate', 'frame-glass') THEN
        RAISE EXCEPTION 'profile_frame_id changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.profile_frame_id IS DISTINCT FROM OLD.profile_frame_id
      AND NEW.profile_frame_id IS NOT NULL AND NEW.profile_frame_id NOT IN ('frame-slate', 'frame-glass') THEN
      RAISE EXCEPTION 'profile_frame_id changes require the trusted server' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.frame_color IS NOT NULL THEN
        RAISE EXCEPTION 'frame_color changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.frame_color IS DISTINCT FROM OLD.frame_color
      AND NEW.frame_color IS NOT NULL THEN
      RAISE EXCEPTION 'frame_color changes require the trusted server' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.card_base_mode IS NOT NULL AND NEW.card_base_mode <> 'mirror' THEN
        RAISE EXCEPTION 'card_base_mode changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.card_base_mode IS DISTINCT FROM OLD.card_base_mode
      AND NEW.card_base_mode IS NOT NULL AND NEW.card_base_mode <> 'mirror' THEN
      RAISE EXCEPTION 'card_base_mode changes require the trusted server' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.theme_primary IS NOT NULL AND lower(NEW.theme_primary) <> '#0a0a0f' THEN
        RAISE EXCEPTION 'theme_primary changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.theme_primary IS DISTINCT FROM OLD.theme_primary
      AND NEW.theme_primary IS NOT NULL AND lower(NEW.theme_primary) <> '#0a0a0f' THEN
      RAISE EXCEPTION 'theme_primary changes require the trusted server' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.theme_accent IS NOT NULL AND lower(NEW.theme_accent) <> '#7b3aed' THEN
        RAISE EXCEPTION 'theme_accent changes require the trusted server' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.theme_accent IS DISTINCT FROM OLD.theme_accent
      AND NEW.theme_accent IS NOT NULL AND lower(NEW.theme_accent) <> '#7b3aed' THEN
      RAISE EXCEPTION 'theme_accent changes require the trusted server' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_card_browser_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_profile_card_browser_write() TO service_role;
DROP TRIGGER IF EXISTS profile_card_browser_write_boundary ON public.profile_customization;
CREATE TRIGGER profile_card_browser_write_boundary
BEFORE INSERT OR UPDATE ON public.profile_customization
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_card_browser_write();
ALTER TABLE public.profile_customization ENABLE ALWAYS TRIGGER profile_card_browser_write_boundary;

-- BEGIN PROFILE CARD READ-ONLY VALIDATION
DO $$
DECLARE guard oid := to_regprocedure('public.guard_profile_card_browser_write()');
BEGIN
  IF guard IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = guard AND NOT prosecdef AND prorettype = 'trigger'::regtype
      AND proconfig = ARRAY['search_path=pg_catalog'] AND provolatile = 'v' AND pronargs = 0
      AND prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profile_customization'::regclass
      AND tgname = 'profile_card_browser_write_boundary' AND tgfoid = guard
      AND tgtype = 23 AND tgenabled = 'A' AND NOT tgisinternal AND tgqual IS NULL AND tgnargs = 0
      AND tgattr::text = ''
  ) THEN
    RAISE EXCEPTION 'Profile card boundary missing or incompatible';
  END IF;
  IF has_function_privilege('anon', guard, 'EXECUTE')
    OR has_function_privilege('authenticated', guard, 'EXECUTE')
    OR NOT has_function_privilege('service_role', guard, 'EXECUTE') THEN
    RAISE EXCEPTION 'Profile card privileges incompatible';
  END IF;
END;
$$;
-- END PROFILE CARD READ-ONLY VALIDATION
