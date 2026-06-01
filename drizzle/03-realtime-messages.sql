-- Supabase Dashboard → SQL Editor (после 02-rls-policies.sql)
-- Без этого шага новые сообщения не приходят в браузер (только после F5).

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Для фильтров Realtime по chat_id (опционально, но рекомендуется)
ALTER TABLE public.messages REPLICA IDENTITY FULL;
