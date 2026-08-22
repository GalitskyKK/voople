-- Granular privacy scopes and server-filtered online presence.
-- Clients never read this table directly; all decisions are made by service-role code.

CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  online_scope text NOT NULL DEFAULT 'contacts_and_groups',
  gaming_scope text NOT NULL DEFAULT 'contacts_and_groups',
  music_scope text NOT NULL DEFAULT 'contacts_and_groups',
  rooms_scope text NOT NULL DEFAULT 'contacts_and_groups',
  invite_scope text NOT NULL DEFAULT 'contacts_and_groups',
  connection_request_scope text NOT NULL DEFAULT 'everyone',
  appear_in_recommendations boolean NOT NULL DEFAULT true,
  show_interests boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_privacy_online_scope_check CHECK (online_scope IN ('everyone', 'contacts_and_groups', 'contacts', 'nobody')),
  CONSTRAINT user_privacy_gaming_scope_check CHECK (gaming_scope IN ('everyone', 'contacts_and_groups', 'contacts', 'nobody')),
  CONSTRAINT user_privacy_music_scope_check CHECK (music_scope IN ('everyone', 'contacts_and_groups', 'contacts', 'nobody')),
  CONSTRAINT user_privacy_rooms_scope_check CHECK (rooms_scope IN ('everyone', 'contacts_and_groups', 'contacts', 'nobody')),
  CONSTRAINT user_privacy_invite_scope_check CHECK (invite_scope IN ('everyone', 'contacts_and_groups', 'contacts', 'nobody')),
  CONSTRAINT user_privacy_connection_scope_check CHECK (connection_request_scope IN ('everyone', 'contacts_and_groups', 'contacts', 'nobody'))
);
--> statement-breakpoint

INSERT INTO public.user_privacy_settings (user_id, online_scope)
SELECT id, CASE WHEN show_online_status THEN 'contacts_and_groups' ELSE 'nobody' END
FROM public.users
ON CONFLICT (user_id) DO NOTHING;
--> statement-breakpoint

ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.user_privacy_settings FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_privacy_settings TO service_role;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.set_user_privacy_settings(
  p_user_id uuid,
  p_online_scope text,
  p_gaming_scope text,
  p_music_scope text,
  p_rooms_scope text,
  p_invite_scope text,
  p_connection_request_scope text,
  p_appear_in_recommendations boolean,
  p_show_interests boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_privacy_settings (
    user_id, online_scope, gaming_scope, music_scope, rooms_scope, invite_scope,
    connection_request_scope, appear_in_recommendations, show_interests, updated_at
  ) VALUES (
    p_user_id, p_online_scope, p_gaming_scope, p_music_scope, p_rooms_scope, p_invite_scope,
    p_connection_request_scope, p_appear_in_recommendations, p_show_interests, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    online_scope = EXCLUDED.online_scope,
    gaming_scope = EXCLUDED.gaming_scope,
    music_scope = EXCLUDED.music_scope,
    rooms_scope = EXCLUDED.rooms_scope,
    invite_scope = EXCLUDED.invite_scope,
    connection_request_scope = EXCLUDED.connection_request_scope,
    appear_in_recommendations = EXCLUDED.appear_in_recommendations,
    show_interests = EXCLUDED.show_interests,
    updated_at = now();

  UPDATE public.users
  SET show_online_status = p_online_scope <> 'nobody'
  WHERE id = p_user_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.privacy_scope_allows(
  p_owner_id uuid,
  p_viewer_id uuid,
  p_scope text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_owner_id = p_viewer_id THEN true
    WHEN p_scope = 'everyone' THEN true
    WHEN p_viewer_id IS NULL OR p_scope = 'nobody' THEN false
    WHEN p_scope = 'contacts' THEN EXISTS (
      SELECT 1
      FROM public.follows outgoing
      JOIN public.follows incoming
        ON incoming.follower_id = outgoing.following_id
       AND incoming.following_id = outgoing.follower_id
      WHERE outgoing.follower_id = p_owner_id
        AND outgoing.following_id = p_viewer_id
    )
    WHEN p_scope = 'contacts_and_groups' THEN
      EXISTS (
        SELECT 1
        FROM public.follows outgoing
        JOIN public.follows incoming
          ON incoming.follower_id = outgoing.following_id
         AND incoming.following_id = outgoing.follower_id
        WHERE outgoing.follower_id = p_owner_id
          AND outgoing.following_id = p_viewer_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.chat_members owner_member
        JOIN public.chat_members viewer_member ON viewer_member.chat_id = owner_member.chat_id
        JOIN public.chats chat ON chat.id = owner_member.chat_id AND chat.type = 'group'
        WHERE owner_member.user_id = p_owner_id
          AND viewer_member.user_id = p_viewer_id
      )
    ELSE false
  END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.list_visible_online_user_ids(p_viewer_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT candidate.id
  FROM public.users candidate
  LEFT JOIN public.user_privacy_settings privacy ON privacy.user_id = candidate.id
  WHERE candidate.last_seen_at >= now() - interval '90 seconds'
    AND candidate.show_online_status = true
    AND public.privacy_scope_allows(
      candidate.id,
      p_viewer_id,
      COALESCE(privacy.online_scope, 'contacts_and_groups')
    );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.set_user_privacy_settings(uuid, text, text, text, text, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.privacy_scope_allows(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.list_visible_online_user_ids(uuid) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_user_privacy_settings(uuid, text, text, text, text, text, text, boolean, boolean) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.privacy_scope_allows(uuid, uuid, text) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.list_visible_online_user_ids(uuid) TO service_role;
