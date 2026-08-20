-- Convert resolvable legacy :emoji_name: text into structured nodes in small,
-- repeatable batches. Unknown/deleted emoji remain plain text.

CREATE OR REPLACE FUNCTION public.backfill_legacy_group_emoji_messages(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_row record;
  remaining text;
  matched text[];
  token text;
  prefix_length integer;
  emoji_id uuid;
  emoji_name text;
  nodes jsonb;
  processed integer := 0;
BEGIN
  IF p_limit < 1 OR p_limit > 5000 THEN
    RAISE EXCEPTION 'invalid_batch_limit';
  END IF;

  FOR message_row IN
    SELECT message.id, message.chat_id, message.text
    FROM public.messages message
    WHERE message.content IS NULL
      AND message.text ~ ':[a-z0-9_]{2,32}:'
    ORDER BY message.created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    remaining := message_row.text;
    nodes := '[]'::jsonb;

    LOOP
      matched := regexp_match(remaining, ':([a-z0-9_]{2,32}):');
      EXIT WHEN matched IS NULL;
      token := ':' || matched[1] || ':';
      prefix_length := strpos(remaining, token) - 1;
      emoji_id := NULL;
      emoji_name := NULL;
      SELECT emoji.id, emoji.name INTO emoji_id, emoji_name
      FROM public.group_emojis emoji
      WHERE emoji.chat_id = message_row.chat_id
        AND emoji.name = matched[1]
        AND emoji.moderation_status = 'automated_approved'
      LIMIT 1;

      IF emoji_id IS NULL THEN
        nodes := nodes || jsonb_build_array(jsonb_build_object(
          'type', 'text',
          'text', substring(remaining from 1 for prefix_length + length(token))
        ));
      ELSE
        IF prefix_length > 0 THEN
          nodes := nodes || jsonb_build_array(jsonb_build_object(
            'type', 'text',
            'text', substring(remaining from 1 for prefix_length)
          ));
        END IF;
        nodes := nodes || jsonb_build_array(jsonb_build_object(
          'type', 'customEmoji',
          'emojiId', emoji_id,
          'name', emoji_name
        ));
      END IF;
      remaining := substring(remaining from prefix_length + length(token) + 1);
    END LOOP;

    IF remaining <> '' THEN
      nodes := nodes || jsonb_build_array(jsonb_build_object('type', 'text', 'text', remaining));
    END IF;
    UPDATE public.messages SET content = nodes WHERE id = message_row.id;
    processed := processed + 1;
  END LOOP;
  RETURN processed;
END;
$$;

--> statement-breakpoint

REVOKE ALL ON FUNCTION public.backfill_legacy_group_emoji_messages(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_legacy_group_emoji_messages(integer)
  TO service_role;
