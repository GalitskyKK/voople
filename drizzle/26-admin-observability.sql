-- Moderation lifecycle and immutable admin action history.

ALTER TABLE public.post_reports
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderator_note varchar(500);

CREATE INDEX IF NOT EXISTS post_reports_status_time_idx
  ON public.post_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  admin_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  target_type varchar(40) NOT NULL,
  target_id varchar(100),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_log_time_idx
  ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.admin_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.moderate_post_report(
  p_report_id uuid,
  p_admin_user_id uuid,
  p_action varchar,
  p_note varchar DEFAULT NULL
)
RETURNS TABLE(media_key text, author_id uuid, post_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.post_reports%ROWTYPE;
  v_post public.posts%ROWTYPE;
BEGIN
  IF p_action NOT IN ('dismiss', 'remove_post') THEN
    RAISE EXCEPTION 'Unsupported moderation action';
  END IF;

  SELECT *
  INTO v_report
  FROM public.post_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  IF v_report.status <> 'pending' THEN
    RAISE EXCEPTION 'Report already reviewed';
  END IF;

  SELECT *
  INTO v_post
  FROM public.posts
  WHERE id = v_report.post_id
  FOR UPDATE;

  IF p_action = 'remove_post' AND v_post.id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF p_action = 'dismiss' THEN
    UPDATE public.post_reports
    SET status = 'dismissed',
        reviewed_at = now(),
        reviewed_by = p_admin_user_id,
        moderator_note = nullif(trim(p_note), '')
    WHERE id = p_report_id;
  ELSE
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      target_type,
      target_id,
      details
    )
    VALUES (
      p_admin_user_id,
      'moderation.remove_post',
      'post',
      v_report.post_id::text,
      jsonb_build_object(
        'reportId', p_report_id,
        'authorId', v_post.author_id,
        'reason', v_report.reason,
        'note', nullif(trim(p_note), '')
      )
    );

    DELETE FROM public.posts WHERE id = v_report.post_id;
  END IF;

  IF p_action = 'dismiss' THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      target_type,
      target_id,
      details
    )
    VALUES (
      p_admin_user_id,
      'moderation.dismiss_report',
      'post_report',
      p_report_id::text,
      jsonb_build_object(
        'postId', v_report.post_id,
        'note', nullif(trim(p_note), '')
      )
    );
  END IF;

  RETURN QUERY SELECT v_post.media_url::text, v_post.author_id, v_report.post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_post_report(uuid, uuid, varchar, varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_post_report(uuid, uuid, varchar, varchar) TO service_role;
