-- Privacy-safe analytics sink. It deliberately has no email, message text,
-- URL, auth token, media identifier or raw client IP columns.

CREATE TABLE IF NOT EXISTS public.client_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_kind varchar(16) NOT NULL CHECK (event_kind IN ('product', 'metric', 'error')),
  event_name varchar(80) NOT NULL,
  platform varchar(16) NOT NULL CHECK (platform IN ('web', 'desktop', 'server')),
  actor_key varchar(64),
  route varchar(160) NOT NULL,
  release varchar(40),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  metric_value double precision,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_telemetry_event_name_time_idx
  ON public.client_telemetry_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS client_telemetry_received_idx
  ON public.client_telemetry_events(received_at DESC);
CREATE INDEX IF NOT EXISTS client_telemetry_actor_time_idx
  ON public.client_telemetry_events(actor_key, occurred_at DESC)
  WHERE actor_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_activation_facts (
  actor_key varchar(64) PRIMARY KEY,
  registered_at timestamptz NOT NULL,
  activated_at timestamptz,
  activation_reason varchar(32) CHECK (activation_reason IN ('reply_received', 'room_with_others')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.product_daily_metrics AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  event_name,
  count(*)::bigint AS event_count,
  count(DISTINCT actor_key) FILTER (WHERE actor_key IS NOT NULL)::bigint AS unique_actors,
  avg((properties->>'durationSeconds')::double precision)
    FILTER (WHERE jsonb_typeof(properties->'durationSeconds') = 'number') AS average_duration_seconds
FROM public.client_telemetry_events
WHERE event_kind = 'product'
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.product_retention_metrics AS
SELECT
  date_trunc('day', signup.occurred_at)::date AS cohort_day,
  count(DISTINCT signup.actor_key)::bigint AS signups,
  count(DISTINCT signup.actor_key) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.client_telemetry_events activity
    WHERE activity.actor_key = signup.actor_key
      AND activity.occurred_at >= signup.occurred_at + interval '1 day'
      AND activity.occurred_at < signup.occurred_at + interval '2 days'
  ))::bigint AS retained_d1,
  count(DISTINCT signup.actor_key) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.client_telemetry_events activity
    WHERE activity.actor_key = signup.actor_key
      AND activity.occurred_at >= signup.occurred_at + interval '7 days'
      AND activity.occurred_at < signup.occurred_at + interval '8 days'
  ))::bigint AS retained_d7,
  count(DISTINCT signup.actor_key) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.client_telemetry_events activity
    WHERE activity.actor_key = signup.actor_key
      AND activity.occurred_at >= signup.occurred_at + interval '30 days'
      AND activity.occurred_at < signup.occurred_at + interval '31 days'
  ))::bigint AS retained_d30
FROM public.client_telemetry_events signup
WHERE signup.event_kind = 'product'
  AND signup.event_name = 'signup_completed'
  AND signup.platform = 'server'
  AND signup.actor_key IS NOT NULL
GROUP BY 1;

CREATE OR REPLACE VIEW public.product_activation_metrics AS
SELECT
  date_trunc('day', registered_at)::date AS cohort_day,
  count(*)::bigint AS registered,
  count(*) FILTER (
    WHERE activated_at IS NOT NULL
      AND activated_at <= registered_at + interval '24 hours'
  )::bigint AS activated_within_24h
FROM public.product_activation_facts
GROUP BY 1;

ALTER TABLE public.client_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_activation_facts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.client_telemetry_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_activation_facts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.client_telemetry_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_activation_facts TO service_role;
GRANT SELECT ON TABLE public.product_daily_metrics, public.product_retention_metrics,
  public.product_activation_metrics TO service_role;

COMMENT ON TABLE public.client_telemetry_events IS
  'Privacy-safe client product, performance and reliability events. Server-only access.';
