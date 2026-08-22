-- Device trust for password sign-in. Only a SHA-256 digest of the random local
-- device identifier is stored; email, password, OTP and session tokens are not.

CREATE TABLE IF NOT EXISTS public.trusted_login_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash varchar(64) NOT NULL,
  label varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT trusted_login_devices_user_hash_unique UNIQUE(user_id, device_hash)
);

CREATE INDEX IF NOT EXISTS trusted_login_devices_user_active_idx
  ON public.trusted_login_devices(user_id, last_used_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.trusted_login_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trusted_login_devices FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trusted_login_devices TO service_role;

COMMENT ON TABLE public.trusted_login_devices IS
  'Server-only device trust records used to require email OTP on unfamiliar password sign-ins.';
