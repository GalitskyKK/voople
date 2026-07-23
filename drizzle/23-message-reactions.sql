-- Реакции на сообщения. chat_id продублирован намеренно: он позволяет
-- подписываться на изменения одного диалога через Supabase Realtime.
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji varchar(10) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS message_reactions_chat_idx
  ON public.message_reactions USING btree (chat_id);
CREATE INDEX IF NOT EXISTS message_reactions_message_idx
  ON public.message_reactions USING btree (message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
