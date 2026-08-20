-- Structured chat content keeps custom emoji stable while text remains a searchable fallback.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS content jsonb;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_content_shape_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_shape_check CHECK (
    content IS NULL OR jsonb_typeof(content) = 'array'
  );

COMMENT ON COLUMN public.messages.content IS
  'Ordered text/custom-emoji nodes. The text column is retained as searchable fallback.';

ALTER TABLE public.message_reactions
  ADD COLUMN IF NOT EXISTS emoji_id uuid REFERENCES public.group_emojis(id) ON DELETE SET NULL;
ALTER TABLE public.message_reactions
  DROP CONSTRAINT IF EXISTS message_reactions_pkey;
ALTER TABLE public.message_reactions
  DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_emoji_pk;
ALTER TABLE public.message_reactions
  ALTER COLUMN emoji DROP NOT NULL;
ALTER TABLE public.message_reactions
  DROP CONSTRAINT IF EXISTS message_reactions_emoji_source_check;
ALTER TABLE public.message_reactions
  ADD CONSTRAINT message_reactions_emoji_source_check CHECK (
    (emoji IS NOT NULL AND emoji_id IS NULL) OR
    (emoji IS NULL AND emoji_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_native_unique
  ON public.message_reactions(message_id, user_id, emoji) WHERE emoji IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_custom_unique
  ON public.message_reactions(message_id, user_id, emoji_id) WHERE emoji_id IS NOT NULL;
