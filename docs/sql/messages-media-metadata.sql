-- Идемпотентно: название и исполнитель для аудио-вложений в чате.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_title varchar(100),
  ADD COLUMN IF NOT EXISTS media_artist varchar(100);
