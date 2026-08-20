-- Migration ledger used by release readiness checks. Existing installations are
-- detected without rewriting product data, then future migrations are recorded
-- by scripts/apply-migration.mjs with their SHA-256 checksum.

CREATE TABLE IF NOT EXISTS public.app_schema_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  release_version text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

--> statement-breakpoint

COMMENT ON TABLE public.app_schema_migrations IS
  'Applied Voople SQL migrations and immutable source checksums.';

--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.group_emojis') IS NOT NULL THEN
    INSERT INTO public.app_schema_migrations (id, checksum, release_version)
    VALUES ('38-group-emojis.sql', 'legacy-detected', 'pre-ledger')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
  ) THEN
    INSERT INTO public.app_schema_migrations (id, checksum, release_version)
    VALUES ('39-structured-chat-content.sql', 'legacy-detected', 'pre-ledger')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.group_sounds') IS NOT NULL THEN
    INSERT INTO public.app_schema_migrations (id, checksum, release_version)
    VALUES ('43-group-sounds.sql', 'legacy-detected', 'pre-ledger')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

--> statement-breakpoint

REVOKE ALL ON TABLE public.app_schema_migrations FROM anon, authenticated;
