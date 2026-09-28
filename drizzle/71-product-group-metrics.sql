-- Privacy-safe Group and voice-loop analytics.
-- Raw Group, Room and Invite identifiers never enter the analytics store. The
-- application writes domain-separated HMAC digests into subject_key.

ALTER TABLE public.client_telemetry_events
  ADD COLUMN IF NOT EXISTS subject_kind varchar(16),
  ADD COLUMN IF NOT EXISTS subject_key varchar(64);
--> statement-breakpoint

ALTER TABLE public.client_telemetry_events
  DROP CONSTRAINT IF EXISTS client_telemetry_subject_pair_check;
--> statement-breakpoint
ALTER TABLE public.client_telemetry_events
  ADD CONSTRAINT client_telemetry_subject_pair_check CHECK (
    (subject_kind IS NULL AND subject_key IS NULL)
    OR (subject_kind IN ('group', 'room', 'invite') AND subject_key IS NOT NULL)
  );
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS client_telemetry_subject_time_idx
  ON public.client_telemetry_events(subject_kind, subject_key, occurred_at DESC)
  WHERE subject_key IS NOT NULL;
--> statement-breakpoint

CREATE OR REPLACE VIEW public.product_group_weekly_metrics AS
WITH group_week AS (
  SELECT
    date_trunc('week', occurred_at)::date AS week,
    subject_key AS group_key,
    count(DISTINCT occurred_at::date) FILTER (
      WHERE event_name = 'room_joined'
    )::bigint AS voice_days,
    count(DISTINCT actor_key) FILTER (
      WHERE actor_key IS NOT NULL AND event_name = 'room_joined'
    )::bigint AS voice_members,
    count(*) FILTER (WHERE event_name = 'room_created')::bigint AS rooms_created,
    count(*) FILTER (WHERE event_name = 'room_joined')::bigint AS room_joins,
    count(*) FILTER (
      WHERE event_name = 'room_joined'
        AND properties->>'transition' = 'switch'
    )::bigint AS room_switches
  FROM public.client_telemetry_events
  WHERE event_kind = 'product'
    AND platform = 'server'
    AND subject_kind = 'group'
    AND subject_key IS NOT NULL
  GROUP BY 1, 2
)
SELECT
  week,
  count(*)::bigint AS active_groups,
  count(*) FILTER (WHERE voice_days >= 2)::bigint AS recurring_voice_groups,
  count(*) FILTER (WHERE voice_members >= 2)::bigint AS social_voice_groups,
  sum(rooms_created)::bigint AS rooms_created,
  sum(room_joins)::bigint AS room_joins,
  sum(room_switches)::bigint AS room_switches
FROM group_week
GROUP BY week;
--> statement-breakpoint

CREATE OR REPLACE VIEW public.product_group_activation_metrics AS
WITH created AS (
  SELECT
    subject_key AS group_key,
    min(occurred_at) AS created_at
  FROM public.client_telemetry_events
  WHERE event_kind = 'product'
    AND platform = 'server'
    AND event_name = 'group_created'
    AND subject_kind = 'group'
    AND subject_key IS NOT NULL
  GROUP BY subject_key
), voice_24h AS (
  SELECT
    created.group_key,
    count(DISTINCT event.actor_key) FILTER (WHERE event.actor_key IS NOT NULL)::bigint AS voice_members
  FROM created
  LEFT JOIN public.client_telemetry_events AS event
    ON event.subject_kind = 'group'
   AND event.subject_key = created.group_key
   AND event.event_kind = 'product'
   AND event.platform = 'server'
   AND event.event_name = 'room_joined'
   AND event.occurred_at >= created.created_at
   AND event.occurred_at < created.created_at + interval '24 hours'
  GROUP BY created.group_key
)
SELECT
  date_trunc('week', created.created_at)::date AS cohort_week,
  count(*)::bigint AS groups_created,
  count(*) FILTER (WHERE voice_24h.voice_members >= 2)::bigint AS social_voice_within_24h
FROM created
JOIN voice_24h USING (group_key)
GROUP BY 1;
--> statement-breakpoint

CREATE OR REPLACE VIEW public.product_group_retention_metrics AS
WITH created AS (
  SELECT
    subject_key AS group_key,
    min(occurred_at) AS created_at
  FROM public.client_telemetry_events
  WHERE event_kind = 'product'
    AND platform = 'server'
    AND event_name = 'group_created'
    AND subject_kind = 'group'
    AND subject_key IS NOT NULL
  GROUP BY subject_key
)
SELECT
  date_trunc('week', created_at)::date AS cohort_week,
  count(*)::bigint AS groups_created,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1
    FROM public.client_telemetry_events AS event
    WHERE event.subject_kind = 'group'
      AND event.subject_key = created.group_key
      AND event.event_kind = 'product'
      AND event.platform = 'server'
      AND event.occurred_at >= created.created_at + interval '7 days'
      AND event.occurred_at < created.created_at + interval '14 days'
  ))::bigint AS retained_w1
FROM created
GROUP BY 1;
--> statement-breakpoint

REVOKE ALL ON TABLE public.product_group_weekly_metrics,
  public.product_group_activation_metrics,
  public.product_group_retention_metrics FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.product_group_weekly_metrics,
  public.product_group_activation_metrics,
  public.product_group_retention_metrics TO service_role;
--> statement-breakpoint

COMMENT ON COLUMN public.client_telemetry_events.subject_key IS
  'Domain-separated HMAC digest of a Group, Room or Invite identifier.';
--> statement-breakpoint
COMMENT ON VIEW public.product_group_weekly_metrics IS
  'Weekly Group voice-loop health without raw Group or member identifiers.';
