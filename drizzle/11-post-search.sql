-- Post text search indexes (trigram ILIKE).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS posts_text_trgm_idx
  ON public.posts USING gin (coalesce(text, '') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS posts_repost_comment_trgm_idx
  ON public.posts USING gin (coalesce(repost_comment, '') gin_trgm_ops);
