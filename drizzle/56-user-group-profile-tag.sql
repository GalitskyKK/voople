-- One optional community tag selected for a user's public profile.
-- Server-only writes guarantee that the selected user is still a member.

CREATE TABLE IF NOT EXISTS public.user_group_profile_tags (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS user_group_profile_tags_chat_idx
  ON public.user_group_profile_tags(chat_id);
--> statement-breakpoint

ALTER TABLE public.user_group_profile_tags ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.user_group_profile_tags FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_group_profile_tags TO service_role;
