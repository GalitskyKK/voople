-- Apply once in Supabase SQL Editor before deploying the matching application code.
-- Safe to run repeatedly.

ALTER TYPE public.post_media_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE public.post_media_type ADD VALUE IF NOT EXISTS 'circle';

ALTER TABLE public.profile_customization
  ADD COLUMN IF NOT EXISTS nickname_font varchar(20) NOT NULL DEFAULT 'sans';

ALTER TABLE public.profile_customization
  ADD COLUMN IF NOT EXISTS nickname_effect varchar(20) NOT NULL DEFAULT 'plain';
